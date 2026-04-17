const express = require('express');
const jwt     = require('jsonwebtoken');
const router  = express.Router();

const { User, Admin }       = require('../models');
const EmailVerification     = require('../models/EmailVerification');
const { protect }           = require('../middleware/auth');
const { generateCode, sendVerificationEmail } = require('../utils/email');

const sign = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: '이메일을 입력해주세요.' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });
    await EmailVerification.deleteMany({ email });
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await EmailVerification.create({ email, code, expiresAt });
    await sendVerificationEmail(email, code);
    res.json({ message: '인증번호가 발송됐습니다. 이메일을 확인해주세요.' });
  } catch (e) {
    console.error('[이메일 발송 오류]', e.message);
    res.status(500).json({ message: '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    const record = await EmailVerification.findOne({ email });
    if (!record)            return res.status(400).json({ message: '인증번호를 먼저 요청해주세요.' });
    if (record.expiresAt < new Date()) return res.status(400).json({ message: '인증번호가 만료됐습니다. 다시 요청해주세요.' });
    if (record.code !== code)          return res.status(400).json({ message: '인증번호가 올바르지 않습니다.' });
    record.verified = true;
    await record.save();
    res.json({ message: '이메일 인증 완료!' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/register', async (req, res) => {
  console.log('[회원가입 요청]', req.body);
  try {
    const { studentId, name, email, password, phone } = req.body;
    const record = await EmailVerification.findOne({ email, verified: true });
    if (!record) return res.status(400).json({ message: '이메일 인증을 먼저 완료해주세요.' });
    const user = await User.create({ studentId, name, email, password, phone });
    await EmailVerification.deleteMany({ email });
    res.status(201).json({
      token: sign(user._id, 'user'),
      user: { ...user.toObject(), password: undefined, role: 'user' },
    });
  } catch (e) {
    console.error('[회원가입 오류]', e.message);
    res.status(400).json({
      message: e.code === 11000 ? '이미 사용 중인 학번 또는 이메일입니다.' : e.message,
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { studentId, password, fcmToken } = req.body;
    const user = await User.findOne({ studentId });
    if (!user || !(await user.checkPassword(password)))
      return res.status(401).json({ message: '학번 또는 비밀번호가 올바르지 않습니다.' });
    if (fcmToken) { user.fcmToken = fcmToken; await user.save(); }
    res.json({ token: sign(user._id, 'user'), user: { ...user.toObject(), password: undefined, role: 'user' } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/admin/login', async (req, res) => {
  try {
    const { adminId, password } = req.body;
    const admin = await Admin.findOne({ adminId });
    if (!admin || !(await admin.checkPassword(password)))
      return res.status(401).json({ message: '관리자 ID 또는 비밀번호가 올바르지 않습니다.' });
    res.json({ token: sign(admin._id, 'admin'), admin: { ...admin.toObject(), password: undefined, role: 'admin' } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/me', protect, (req, res) => res.json(req.user));

router.put('/fcm-token', protect, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await User.findByIdAndUpdate(req.user._id, { fcmToken });
    res.json({ message: 'FCM 토큰 업데이트 완료' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;