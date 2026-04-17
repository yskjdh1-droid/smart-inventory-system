const express = require('express');
const jwt     = require('jsonwebtoken');
const QRCode  = require('qrcode');
const multer  = require('multer');
const path    = require('path');

const { User, Admin, Category, Equipment, Rental, Penalty, StatusHistory, DamageReport } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');
const { sendPushToUser }     = require('../utils/fcm');

const sign = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ═══════════════════════════════════════════════════
// 1. AUTH
// ═══════════════════════════════════════════════════
const authRouter = express.Router();

authRouter.post('/register', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ token: sign(user._id, 'user'), user: { ...user.toObject(), password: undefined } });
  } catch (e) { res.status(400).json({ message: e.code === 11000 ? '이미 사용 중인 학번 또는 이메일입니다.' : e.message }); }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { studentId, password } = req.body;
    const user = await User.findOne({ studentId });
    if (!user || !(await user.checkPassword(password)))
      return res.status(401).json({ message: '학번 또는 비밀번호가 올바르지 않습니다.' });
    if (req.body.fcmToken) { user.fcmToken = req.body.fcmToken; await user.save(); }
    res.json({ token: sign(user._id, 'user'), user: { ...user.toObject(), password: undefined, role: 'user' } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

authRouter.post('/admin/login', async (req, res) => {
  try {
    const { adminId, password } = req.body;
    const admin = await Admin.findOne({ adminId });
    if (!admin || !(await admin.checkPassword(password)))
      return res.status(401).json({ message: '관리자 ID 또는 비밀번호가 올바르지 않습니다.' });
    res.json({ token: sign(admin._id, 'admin'), admin: { ...admin.toObject(), password: undefined, role: 'admin' } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

authRouter.get('/me', protect, (req, res) => res.json(req.user));

// ═══════════════════════════════════════════════════
// 2. CATEGORIES
// ═══════════════════════════════════════════════════
const catRouter = express.Router();
catRouter.get('/',       protect,             async (req, res) => res.json(await Category.find()));
catRouter.post('/',      protect, adminOnly,  async (req, res) => res.status(201).json(await Category.create(req.body)));
catRouter.put('/:id',   protect, adminOnly,  async (req, res) => res.json(await Category.findByIdAndUpdate(req.params.id, req.body, { new: true })));
catRouter.delete('/:id', protect, adminOnly, async (req, res) => { await Category.findByIdAndDelete(req.params.id); res.json({ message: '삭제됐습니다.' }); });

// ═══════════════════════════════════════════════════
// 3. EQUIPMENT
// ═══════════════════════════════════════════════════
const eqRouter = express.Router();

eqRouter.get('/', protect, async (req, res) => {
  try {
    const { search, category, status } = req.query;
    const q = {};
    if (search)   q.$or = [{ modelName: new RegExp(search, 'i') }, { serialNumber: new RegExp(search, 'i') }];
    if (category) q.category = category;
    if (status)   q.status = status;
    res.json(await Equipment.find(q).populate('category', 'name maxRentalDays').populate('managedBy', 'name'));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

eqRouter.get('/:id', protect, async (req, res) => {
  const item = await Equipment.findById(req.params.id).populate('category').populate('managedBy', 'name');
  if (!item) return res.status(404).json({ message: '기자재를 찾을 수 없습니다.' });
  res.json(item);
});

eqRouter.post('/', protect, adminOnly, upload.array('images', 3), async (req, res) => {
  try {
    const item = await Equipment.create({
      ...req.body,
      managedBy: req.user._id,
      maxRentalDays: Number(req.body.maxRentalDays) || 7,
      images: req.files?.map((f) => `/uploads/${f.filename}`) || [],
    });
    const qrData = `${process.env.APP_URL || 'http://localhost:3000'}/equipment/${item._id}`;
    item.qrCodeUrl = await QRCode.toDataURL(qrData);
    await item.save();
    res.status(201).json(item);
  } catch (e) { res.status(400).json({ message: e.code === 11000 ? '이미 존재하는 시리얼 번호입니다.' : e.message }); }
});

eqRouter.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const prev = await Equipment.findById(req.params.id);
    const item = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (prev.status !== item.status) {
      await StatusHistory.create({ equipment: item._id, admin: req.user._id, prevStatus: prev.status, newStatus: item.status, reason: req.body.reason });
    }
    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

eqRouter.get('/:id/qr', protect, async (req, res) => {
  const item = await Equipment.findById(req.params.id);
  if (!item) return res.status(404).json({ message: '없음' });
  res.json({ qrCodeUrl: item.qrCodeUrl });
});

eqRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  await Equipment.findByIdAndDelete(req.params.id);
  res.json({ message: '삭제됐습니다.' });
});

// ═══════════════════════════════════════════════════
// 4. RENTALS
// ═══════════════════════════════════════════════════
const rentRouter = express.Router();

rentRouter.get('/my', protect, async (req, res) => {
  res.json(await Rental.find({ user: req.user._id })
    .populate('equipment', 'modelName serialNumber category')
    .sort({ createdAt: -1 }));
});

rentRouter.get('/', protect, adminOnly, async (req, res) => {
  const q = req.query.status ? { status: req.query.status } : {};
  res.json(await Rental.find(q)
    .populate('user', 'name studentId phone')
    .populate('equipment', 'modelName serialNumber')
    .sort({ createdAt: -1 }));
});

rentRouter.post('/', protect, async (req, res) => {
  try {
    const { equipmentId, dueDate, purpose } = req.body;
    if (req.user.isSuspended)
      return res.status(403).json({ message: '패널티로 인해 대여가 정지됐습니다.' });
    const eq = await Equipment.findById(equipmentId);
    if (!eq || eq.status !== 'AVAILABLE')
      return res.status(400).json({ message: '대여할 수 없는 기자재입니다.' });
    const rental = await Rental.create({ user: req.user._id, equipment: equipmentId, dueDate, purpose });
    eq.status = 'RENTED';
    await eq.save();
    res.status(201).json(rental);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

rentRouter.put('/:id/return', protect, upload.single('photo'), async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id).populate('user');
    if (!rental || rental.status === 'RETURNED')
      return res.status(400).json({ message: '이미 반납된 대여입니다.' });
    if (rental.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ message: '권한이 없습니다.' });
    rental.status         = 'RETURNED';
    rental.returnDate     = new Date();
    rental.returnPhotoUrl = req.file ? `/uploads/${req.file.filename}` : '';
    await rental.save();
    await Equipment.findByIdAndUpdate(rental.equipment, { status: 'AVAILABLE' });
    res.json({ message: '반납이 완료됐습니다.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

rentRouter.put('/:id/extend', protect, async (req, res) => {
  try {
    const { newDueDate, approved } = req.body;
    const rental = await Rental.findById(req.params.id).populate('user');
    if (!rental) return res.status(404).json({ message: '대여를 찾을 수 없습니다.' });
    if (approved && req.user.role === 'admin') {
      rental.dueDate           = rental.extendNewDueDate || newDueDate;
      rental.extendRequested   = false;
      rental.extendNewDueDate  = undefined;
      await rental.save();
      await sendPushToUser(rental.user, '연장 승인', `반납 예정일이 ${new Date(rental.dueDate).toLocaleDateString('ko-KR')}로 변경됐습니다.`);
      return res.json({ message: '연장이 승인됐습니다.' });
    }
    rental.extendRequested  = true;
    rental.extendNewDueDate = newDueDate;
    await rental.save();
    res.json({ message: '연장 신청이 접수됐습니다. 관리자 승인 후 확정됩니다.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

rentRouter.put('/:id/force-return', protect, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const rental = await Rental.findById(req.params.id).populate('user');
    if (!rental) return res.status(404).json({ message: '없음' });
    rental.status             = 'RETURNED';
    rental.returnDate         = new Date();
    rental.isForceReturn      = true;
    rental.forceReturnReason  = reason;
    rental.forceReturnBy      = req.user._id;
    await rental.save();
    await Equipment.findByIdAndUpdate(rental.equipment, { status: 'AVAILABLE' });
    await sendPushToUser(rental.user, '강제 반납 처리', `기자재가 강제 반납 처리됐습니다. 사유: ${reason}`);
    res.json({ message: '강제 반납 처리됐습니다.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════
// 5. ADMIN
// ═══════════════════════════════════════════════════
const adminRouter = express.Router();

adminRouter.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [total, available, rented, repairing, overdueCount, todayCount] = await Promise.all([
      Equipment.countDocuments(),
      Equipment.countDocuments({ status: 'AVAILABLE' }),
      Equipment.countDocuments({ status: 'RENTED' }),
      Equipment.countDocuments({ status: 'REPAIRING' }),
      Rental.countDocuments({ status: 'OVERDUE' }),
      Rental.countDocuments({ status: 'ACTIVE', dueDate: { $gte: new Date(new Date().setHours(0,0,0,0)), $lte: new Date(new Date().setHours(23,59,59,999)) } }),
    ]);
    res.json({ total, available, rented, repairing, overdue: overdueCount, todayReturns: todayCount });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

adminRouter.get('/overdue', protect, adminOnly, async (req, res) => {
  res.json(await Rental.find({ status: 'OVERDUE' })
    .populate('user', 'name studentId phone')
    .populate('equipment', 'modelName serialNumber')
    .sort({ dueDate: 1 }));
});

adminRouter.get('/due-today', protect, adminOnly, async (req, res) => {
  const start = new Date(); start.setHours(0,0,0,0);
  const end   = new Date(); end.setHours(23,59,59,999);
  res.json(await Rental.find({ status: 'ACTIVE', dueDate: { $gte: start, $lte: end } })
    .populate('user', 'name studentId')
    .populate('equipment', 'modelName serialNumber'));
});

adminRouter.get('/users', protect, adminOnly, async (req, res) => {
  res.json(await User.find().select('-password').sort({ penaltyScore: -1 }));
});

adminRouter.post('/penalty', protect, adminOnly, async (req, res) => {
  try {
    const { userId, score, reason, rentalId } = req.body;
    await Penalty.create({ user: userId, rental: rentalId, score, reason, issuedBy: req.user._id });
    const user = await User.findByIdAndUpdate(userId, { $inc: { penaltyScore: score } }, { new: true });
    if (user.penaltyScore >= 10 && !user.isSuspended) {
      user.isSuspended = true;
      await user.save();
      await sendPushToUser(user, '대여 정지', '패널티 누적으로 대여가 정지됐습니다. 관리자에게 문의하세요.');
    } else {
      await sendPushToUser(user, '패널티 부과', `${score}점이 부과됐습니다. 사유: ${reason}`);
    }
    res.status(201).json({ message: `패널티 ${score}점 부과됐습니다.` });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

adminRouter.put('/penalty/:userId/reduce', protect, adminOnly, async (req, res) => {
  try {
    const { score, reason } = req.body;
    await Penalty.create({ user: req.params.userId, score: -score, reason, issuedBy: req.user._id });
    const user = await User.findByIdAndUpdate(req.params.userId, { $inc: { penaltyScore: -score } }, { new: true });
    if (user.penaltyScore < 10 && user.isSuspended) { user.isSuspended = false; await user.save(); }
    await sendPushToUser(user, '패널티 감면', `${score}점이 감면됐습니다.`);
    res.json({ message: `패널티 ${score}점 감면됐습니다.` });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════
// 6. DAMAGE REPORTS
// ═══════════════════════════════════════════════════
const reportRouter = express.Router();

reportRouter.post('/damage', protect, upload.single('photo'), async (req, res) => {
  try {
    const { equipmentId, description, rentalId } = req.body;
    const report = await DamageReport.create({
      equipment: equipmentId, user: req.user._id, rental: rentalId,
      description, photoUrl: req.file ? `/uploads/${req.file.filename}` : '',
    });
    // 관리자에게 알림 (현재는 콘솔, 추후 FCM)
    console.log(`[신고] ${req.user.name} - 기자재 ID: ${equipmentId}`);
    res.status(201).json(report);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

reportRouter.get('/damage', protect, adminOnly, async (req, res) => {
  res.json(await DamageReport.find()
    .populate('equipment', 'modelName serialNumber')
    .populate('user', 'name studentId')
    .sort({ createdAt: -1 }));
});

reportRouter.put('/damage/:id', protect, adminOnly, async (req, res) => {
  res.json(await DamageReport.findByIdAndUpdate(req.params.id, { ...req.body, resolvedBy: req.user._id }, { new: true }));
});

module.exports = { authRouter, catRouter, eqRouter, rentRouter, adminRouter, reportRouter };
