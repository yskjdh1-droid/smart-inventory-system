const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    passwordHash: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    borrowBlockedUntil: { type: Date, default: null },
    role: {
      type: String,
      enum: ["STUDENT", "MANAGER", "ADMIN"],
      default: "STUDENT"
    }
  },
  {
    timestamps: true,
    collection: "users"
  }
);

module.exports = mongoose.model("User", userSchema);
