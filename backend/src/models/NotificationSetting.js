const mongoose = require("mongoose");

const notificationSettingSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: ["USER", "ADMIN"], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    pushEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true },
    dueReminderEnabled: { type: Boolean, default: true },
    dueReminderHoursBefore: { type: Number, default: 24 },
    overdueAlertEnabled: { type: Boolean, default: true },
    incidentAlertEnabled: { type: Boolean, default: true },
    digestTime: { type: String, default: "09:00" }
  },
  { timestamps: true, collection: "notificationSettings" }
);

notificationSettingSchema.index({ scope: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("NotificationSetting", notificationSettingSchema);
