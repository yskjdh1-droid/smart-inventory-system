const Loan = require("../models/Loan");
const NotificationSetting = require("../models/NotificationSetting");
const User = require("../models/User");
const Equipment = require("../models/Equipment");
const { FcmService } = require("./fcm.service");
const { mailer } = require("../config/mailer");
const env = require("../config/env");

const DEFAULT_DUE_REMINDER_HOURS_BEFORE = 24;
const SAME_DAY_REMINDER_HOUR = 9;
const SWEEP_INTERVAL_MS = 60 * 1000;

let schedulerStarted = false;
let sweepRunning = false;
let sweepTimer = null;

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateKey(date) {
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("-");
}

function cloneDate(date) {
  return new Date(date.getTime());
}

function formatReminderDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function buildMorningReminderDate(dueDate) {
  const reminderDate = cloneDate(dueDate);
  reminderDate.setHours(SAME_DAY_REMINDER_HOUR, 0, 0, 0);
  return reminderDate;
}

function buildBeforeReminderDate(dueDate, hoursBefore) {
  return new Date(dueDate.getTime() - hoursBefore * 60 * 60 * 1000);
}

async function getUserReminderSetting(userId) {
  const setting = await NotificationSetting.findOne({ scope: "USER", userId }).lean();
  return {
    pushEnabled: setting ? setting.pushEnabled !== false : true,
    emailEnabled: setting ? setting.emailEnabled !== false : true,
    dueReminderEnabled: setting ? setting.dueReminderEnabled !== false : true,
    dueReminderHoursBefore:
      setting && Number.isFinite(setting.dueReminderHoursBefore)
        ? setting.dueReminderHoursBefore
        : DEFAULT_DUE_REMINDER_HOURS_BEFORE
  };
}

async function sendPush(userId, title, body, data) {
  try {
    const result = await FcmService.sendToUser(userId, {
      notification: { title, body },
      data
    });
    return result.sent > 0;
  } catch (err) {
    console.error("Failed to send push reminder:", err.message);
    return false;
  }
}

async function sendEmail(to, title, body) {
  if (!to) {
    return false;
  }

  try {
    await mailer.sendMail({
      from: env.mailFrom,
      to,
      subject: `[Smart Inventory] ${title}`,
      text: body
    });
    return true;
  } catch (err) {
    console.error("Failed to send email reminder:", err.message);
    return false;
  }
}

async function deliverReminder({ user, equipment, loan, reminderKind }) {
  const dueDateText = formatReminderDate(loan.dueDate);
  const title = reminderKind === "SAME_DAY" ? "반납 당일 알림" : "반납 하루 전 알림";
  const body = `${user.name}님, ${equipment.name}의 반납 예정일은 ${dueDateText}입니다.`;
  const data = {
    type: "LOAN_DUE_REMINDER",
    reminderKind,
    loanId: loan._id.toString(),
    equipmentId: equipment._id.toString(),
    dueDate: loan.dueDate.toISOString()
  };

  const [pushSent, emailSent] = await Promise.all([
    user.reminderSetting.pushEnabled ? sendPush(user._id, title, body, data) : Promise.resolve(false),
    user.reminderSetting.emailEnabled ? sendEmail(user.email, title, body) : Promise.resolve(false)
  ]);

  return pushSent || emailSent;
}

async function processLoanReminder(loan, now) {
  const user = await User.findById(loan.userId).select("email name").lean();
  const equipment = await Equipment.findById(loan.equipmentId).select("name").lean();

  if (!user || !equipment) {
    return false;
  }

  user.reminderSetting = await getUserReminderSetting(loan.userId);
  if (!user.reminderSetting.dueReminderEnabled) {
    return false;
  }

  const dueDate = new Date(loan.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  const beforeReminderDate = buildBeforeReminderDate(dueDate, user.reminderSetting.dueReminderHoursBefore);
  const morningReminderDate = buildMorningReminderDate(dueDate);

  if (
    !loan.dueReminder24hSentAt &&
    dateKey(now) === dateKey(beforeReminderDate) &&
    now >= beforeReminderDate &&
    now < dueDate
  ) {
    const delivered = await deliverReminder({ user, equipment, loan, reminderKind: "ONE_DAY_BEFORE" });
    if (delivered) {
      await Loan.findByIdAndUpdate(loan._id, { dueReminder24hSentAt: new Date() });
    }
    return delivered;
  }

  if (
    !loan.dueReminderMorningSentAt &&
    dateKey(now) === dateKey(dueDate) &&
    now >= morningReminderDate &&
    now < dueDate
  ) {
    const delivered = await deliverReminder({ user, equipment, loan, reminderKind: "SAME_DAY" });
    if (delivered) {
      await Loan.findByIdAndUpdate(loan._id, { dueReminderMorningSentAt: new Date() });
    }
    return delivered;
  }

  return false;
}

async function runDueReminderSweep() {
  if (sweepRunning) {
    return { skipped: true };
  }

  sweepRunning = true;
  try {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - 1);
    windowStart.setHours(0, 0, 0, 0);

    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + 1);
    windowEnd.setHours(23, 59, 59, 999);

    const loans = await Loan.find({
      status: "ACTIVE",
      dueDate: { $gte: windowStart, $lte: windowEnd }
    })
      .select("userId equipmentId dueDate status dueReminder24hSentAt dueReminderMorningSentAt")
      .sort({ dueDate: 1 });

    let sent = 0;
    for (const loan of loans) {
      try {
        const delivered = await processLoanReminder(loan, now);
        if (delivered) {
          sent += 1;
        }
      } catch (err) {
        console.error("Failed to process due reminder:", err.message);
      }
    }

    return { skipped: false, scanned: loans.length, sent };
  } finally {
    sweepRunning = false;
  }
}

function startLoanReminderScheduler() {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;

  void runDueReminderSweep().catch((err) => {
    console.error("Initial due reminder sweep failed:", err.message);
  });

  sweepTimer = setInterval(() => {
    void runDueReminderSweep().catch((err) => {
      console.error("Due reminder sweep failed:", err.message);
    });
  }, SWEEP_INTERVAL_MS);

  if (typeof sweepTimer.unref === "function") {
    sweepTimer.unref();
  }
}

module.exports = {
  runDueReminderSweep,
  startLoanReminderScheduler
};