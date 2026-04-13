const Equipment = require("../models/Equipment");
const Loan = require("../models/Loan");
const User = require("../models/User");
const Penalty = require("../models/Penalty");
const { QRCodeService } = require("./qr-code.service");

class LoanScanService {
  static async applyLateReturnPenalty({ userId, loan }) {
    if (!loan.dueDate || !loan.returnedAt || loan.returnedAt <= loan.dueDate) {
      return null;
    }

    const now = new Date();
    const overdueMs = loan.returnedAt.getTime() - loan.dueDate.getTime();
    const overdueDays = Math.floor(overdueMs / (24 * 60 * 60 * 1000));
    if (overdueDays <= 0) {
      return null;
    }
    const blockedUntil = new Date(now.getTime() + overdueDays * 24 * 60 * 60 * 1000);
    await User.findByIdAndUpdate(userId, { borrowBlockedUntil: blockedUntil });

    await Penalty.create({
      userId,
      loanId: loan._id,
      reason: `Late return: ${overdueDays}-day borrow block`,
      amount: 0,
      status: "PENDING"
    });

    return { blockedUntil, overdueDays };
  }

  static async processScan({ userId, qrCode, notes }) {
    const normalizedCode = QRCodeService.extractQrCode(qrCode);
    const equipment = await Equipment.findOne({ qrCode: normalizedCode, deletedAt: null });
    if (!equipment) {
      const e = new Error("Equipment not found");
      e.status = 404;
      e.code = "EQUIPMENT_NOT_FOUND";
      throw e;
    }

    const activeLoanByUser = await Loan.findOne({
      userId,
      equipmentId: equipment._id,
      status: "ACTIVE"
    });

    if (activeLoanByUser) {
      activeLoanByUser.status = "RETURNED";
      activeLoanByUser.returnedAt = new Date();
      if (notes) {
        activeLoanByUser.notes = notes;
      }
      await activeLoanByUser.save();

      const penalty = await LoanScanService.applyLateReturnPenalty({
        userId,
        loan: activeLoanByUser
      });

      equipment.status = "AVAILABLE";
      await equipment.save();

      return {
        action: "RETURN",
        loanId: activeLoanByUser._id,
        equipmentId: equipment._id,
        status: activeLoanByUser.status,
        returnedAt: activeLoanByUser.returnedAt,
        penalty: penalty
          ? {
              type: "LATE_RETURN_BLOCK",
              blockedUntil: penalty.blockedUntil,
              overdueDays: penalty.overdueDays
            }
          : null
      };
    }

    const user = await User.findById(userId);
    if (user && user.borrowBlockedUntil && user.borrowBlockedUntil > new Date()) {
      const e = new Error(`Late return penalty active until ${user.borrowBlockedUntil.toISOString()}`);
      e.status = 403;
      e.code = "BORROW_BLOCKED";
      throw e;
    }

    const activeLoanByAnyUser = await Loan.findOne({ equipmentId: equipment._id, status: "ACTIVE" });
    if (activeLoanByAnyUser) {
      const e = new Error("이미 다른 사용자가 대여중인 물품입니다");
      e.status = 409;
      e.code = "EQUIPMENT_NOT_AVAILABLE";
      throw e;
    }

    if (equipment.status !== "AVAILABLE") {
      const e = new Error("Equipment not available");
      e.status = 409;
      e.code = "EQUIPMENT_NOT_AVAILABLE";
      throw e;
    }

    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const loan = await Loan.create({
      userId,
      equipmentId: equipment._id,
      dueDate,
      notes: notes || "",
      status: "ACTIVE"
    });

    equipment.status = "BORROWED";
    await equipment.save();

    return {
      action: "BORROW",
      loanId: loan._id,
      equipmentId: equipment._id,
      status: loan.status,
      dueDate: loan.dueDate
    };
  }
}

module.exports = { LoanScanService };
