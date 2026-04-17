require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const cron     = require('node-cron');
const path     = require('path');
const fs       = require('fs');

const { Rental, User, Penalty, Equipment } = require('./models');
const { sendNotification }                 = require('./utils/fcm');
const {
  authRouter, catRouter, eqRouter,
  rentRouter, adminRouter, reportRouter,
} = require('./routes');

const authRouterV2 = require('./routes/auth');

const app = express();

// ── 미들웨어 ──────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── 라우터 ────────────────────────────────────────
app.use('/api/auth',       authRouterV2);
app.use('/api/categories', catRouter);
app.use('/api/equipment',  eqRouter);
app.use('/api/rentals',    rentRouter);
app.use('/api/admin',      adminRouter);
app.use('/api/reports',    reportRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// FCM 헬퍼 — user 객체에 fcmToken 있으면 발송
async function sendPushToUser(user, title, body, data = {}) {
  if (!user?.fcmToken) return;
  await sendNotification(user.fcmToken, title, body, data);
}

// ── MongoDB 연결 ──────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB 연결 완료'))
  .catch((e) => console.error('❌ MongoDB 연결 실패:', e));

// ── CRON 1: 매일 자정 — 연체 자동 처리 ─────────────
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] 연체 처리 시작');
  const now     = new Date();
  const actives = await Rental.find({ status: 'ACTIVE', dueDate: { $lt: now } }).populate('user').populate('equipment', 'modelName');

  for (const r of actives) {
    r.status = 'OVERDUE';
    await r.save();

    const days = Math.floor((now - r.dueDate) / 86400000);
    if (days >= 1) {
      await Penalty.create({ user: r.user._id, rental: r._id, score: days, reason: `${days}일 연체 자동 부과` });
      const user = await User.findByIdAndUpdate(r.user._id, { $inc: { penaltyScore: days } }, { new: true });
      if (user.penaltyScore >= 10 && !user.isSuspended) {
        user.isSuspended = true;
        await user.save();
        await sendPushToUser(user, '대여 정지', '패널티 누적으로 대여가 정지됐습니다.');
      } else {
        await sendPushToUser(user, '⚠️ 연체 알림', `${r.equipment?.modelName} 반납이 ${days}일 초과됐습니다. 즉시 반납해주세요.`);
      }
    }
  }
  console.log(`[CRON] 연체 처리 완료 (${actives.length}건)`);
});

// ── CRON 2: 매일 오전 9시 — D-3, D-1 알림 ──────────
cron.schedule('0 9 * * *', async () => {
  console.log('[CRON] 반납 예정 알림 발송 시작');
  const now = new Date();

  for (const days of [3, 1]) {
    const target = new Date(now);
    target.setDate(target.getDate() + days);
    const start = new Date(new Date(target).setHours(0, 0, 0, 0));
    const end   = new Date(new Date(target).setHours(23, 59, 59, 999));

    const rentals = await Rental.find({ status: 'ACTIVE', dueDate: { $gte: start, $lte: end } })
      .populate('user').populate('equipment', 'modelName');

    for (const r of rentals) {
      await sendPushToUser(
        r.user,
        `📦 반납 D-${days} 알림`,
        `${r.equipment?.modelName} 반납 예정일이 ${days}일 남았습니다.`,
        { rentalId: String(r._id) }
      );
    }
    console.log(`[CRON] D-${days} 알림 ${rentals.length}건 발송`);
  }
});

// ── 서버 시작 ─────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 서버 실행: http://0.0.0.0:${PORT}`);
  console.log(`   로컬 접속: http://localhost:${PORT}`);
  console.log(`   모바일 접속: http://<본인IP>:${PORT}`);
});