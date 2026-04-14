const mongoose = require("mongoose");
const Equipment = require("../models/Equipment");
const Loan = require("../models/Loan");
const User = require("../models/User");
const { QRCodeService } = require("./qr-code.service");

class LoanScanService {
  static async applyLateReturnBorrowBlock({ userId, loan, session = null }) {
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
    await User.findByIdAndUpdate(userId, { borrowBlockedUntil: blockedUntil }, { session });

    return { blockedUntil, overdueDays };
  }

  static async processScan({ userId, qrCode, notes }) {
    const normalizedCode = QRCodeService.extractQrCode(qrCode);
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const equipment = await Equipment.findOne({ qrCode: normalizedCode, deletedAt: null }).session(session);
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
        }).session(session);

        if (activeLoanByUser) {
          activeLoanByUser.status = "RETURNED";
          activeLoanByUser.returnedAt = new Date();
          if (notes) {
            activeLoanByUser.notes = notes;
          }
          await activeLoanByUser.save({ session });

          const borrowBlock = await LoanScanService.applyLateReturnBorrowBlock({
            userId,
            loan: activeLoanByUser,
            session
          });

          const nextEquipmentStatus = ["REPAIR", "LOST", "UNAVAILABLE"].includes(equipment.status)
            ? equipment.status
            : "AVAILABLE";
          equipment.status = nextEquipmentStatus;
          await equipment.save({ session });

          result = {
            action: "RETURN",
            loanId: activeLoanByUser._id,
            equipmentId: equipment._id,
            status: activeLoanByUser.status,
            returnedAt: activeLoanByUser.returnedAt,
            borrowBlock: borrowBlock
              ? {
                  blockedUntil: borrowBlock.blockedUntil,
                  overdueDays: borrowBlock.overdueDays
                }
              : null
          };
          return;
        }

        const user = await User.findById(userId).session(session);
        if (user && user.borrowBlockedUntil && user.borrowBlockedUntil > new Date()) {
          const e = new Error(`Borrow blocked until ${user.borrowBlockedUntil.toISOString()}`);
          e.status = 403;
          e.code = "BORROW_BLOCKED";
          throw e;
        }

        const activeLoanByAnyUser = await Loan.findOne({ equipmentId: equipment._id, status: "ACTIVE" }).session(session);
        if (activeLoanByAnyUser) {
          const e = new Error("이미 다른 사용자가 대여중인 물품입니다");
          e.status = 409;
          e.code = "EQUIPMENT_BORROWED_BY_ANOTHER_USER";
          throw e;
        }

        if (equipment.status !== "AVAILABLE") {
          const e = new Error("Equipment not available");
          e.status = 409;
          e.code = "EQUIPMENT_NOT_AVAILABLE";
          throw e;
        }

        const locked = await Equipment.updateOne(
          { _id: equipment._id, status: "AVAILABLE", deletedAt: null },
          { $set: { status: "BORROWED" } },
          { session }
        );
        if (locked.modifiedCount !== 1) {
          const e = new Error("이미 다른 사용자가 대여중인 물품입니다");
          e.status = 409;
          e.code = "EQUIPMENT_BORROWED_BY_ANOTHER_USER";
          throw e;
        }

        const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const loan = await Loan.create(
          [
            {
              userId,
              equipmentId: equipment._id,
              dueDate,
              notes: notes || "",
              status: "ACTIVE"
            }
          ],
          { session }
        );

        result = {
          action: "BORROW",
          loanId: loan[0]._id,
          equipmentId: equipment._id,
          status: loan[0].status,
          dueDate: loan[0].dueDate
        };
      });

      return result;
    } catch (err) {
      if (err && err.code === 11000) {
        err.status = 409;
        err.code = "EQUIPMENT_BORROWED_BY_ANOTHER_USER";
        err.message = "이미 다른 사용자가 대여중인 물품입니다";
      }
      throw err;
    } finally {
      session.endSession();
    }
  }
}

module.exports = { LoanScanService };
