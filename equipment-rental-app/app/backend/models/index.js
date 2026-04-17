const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── User ─────────────────────────────────────────
const userSchema = new mongoose.Schema({
  studentId:    { type: String, required: true, unique: true },
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  password:     { type: String, required: true },
  phone:        String,
  department:   String,
  penaltyScore: { type: Number, default: 0 },
  isSuspended:  { type: Boolean, default: false },
  fcmToken:     String,
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.checkPassword = function (pw) {
  return bcrypt.compare(pw, this.password);
};

// ── Admin ─────────────────────────────────────────
const adminSchema = new mongoose.Schema({
  adminId:    { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  department: String,
  level:      { type: String, enum: ['SUPER', 'STAFF'], default: 'STAFF' },
}, { timestamps: true });

adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});
adminSchema.methods.checkPassword = function (pw) {
  return bcrypt.compare(pw, this.password);
};

// ── Category ──────────────────────────────────────
const categorySchema = new mongoose.Schema({
  name:          { type: String, required: true, unique: true },
  maxRentalDays: { type: Number, default: 7 },
  iconColor:     { type: String, default: '#028090' },
});

// ── Equipment ─────────────────────────────────────
const equipmentSchema = new mongoose.Schema({
  category:      { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  managedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  serialNumber:  { type: String, required: true, unique: true },
  modelName:     { type: String, required: true },
  qrCodeUrl:     String,
  images:        [String],
  status: {
    type: String,
    enum: ['AVAILABLE', 'RENTED', 'REPAIRING', 'LOST'],
    default: 'AVAILABLE',
  },
  maxRentalDays: { type: Number, default: 7 },
  note:          String,
}, { timestamps: true });

// ── Rental ────────────────────────────────────────
const rentalSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  equipment:     { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
  rentalDate:    { type: Date, default: Date.now },
  dueDate:       { type: Date, required: true },
  returnDate:    Date,
  returnPhotoUrl:String,
  status: {
    type: String,
    enum: ['ACTIVE', 'RETURNED', 'OVERDUE'],
    default: 'ACTIVE',
  },
  purpose:           String,
  extendRequested:   { type: Boolean, default: false },
  extendNewDueDate:  Date,
  isForceReturn:     { type: Boolean, default: false },
  forceReturnReason: String,
  forceReturnBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  note:              String,
}, { timestamps: true });

// ── Penalty ───────────────────────────────────────
const penaltySchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rental:   { type: mongoose.Schema.Types.ObjectId, ref: 'Rental' },
  score:    { type: Number, required: true },
  reason:   { type: String, required: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

// ── StatusHistory ─────────────────────────────────
const statusHistorySchema = new mongoose.Schema({
  equipment:  { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
  admin:      { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  prevStatus: String,
  newStatus:  { type: String, required: true },
  reason:     String,
  changedAt:  { type: Date, default: Date.now },
});

// ── DamageReport ──────────────────────────────────
const damageReportSchema = new mongoose.Schema({
  equipment:   { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rental:      { type: mongoose.Schema.Types.ObjectId, ref: 'Rental' },
  description: { type: String, required: true },
  photoUrl:    String,
  status: {
    type: String,
    enum: ['RECEIVED', 'REPAIRING', 'DONE'],
    default: 'RECEIVED',
  },
  repairCost:   Number,
  resolvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  resolvedNote: String,
}, { timestamps: true });

module.exports = {
  User:          mongoose.model('User', userSchema),
  Admin:         mongoose.model('Admin', adminSchema),
  Category:      mongoose.model('Category', categorySchema),
  Equipment:     mongoose.model('Equipment', equipmentSchema),
  Rental:        mongoose.model('Rental', rentalSchema),
  Penalty:       mongoose.model('Penalty', penaltySchema),
  StatusHistory: mongoose.model('StatusHistory', statusHistorySchema),
  DamageReport:  mongoose.model('DamageReport', damageReportSchema),
};