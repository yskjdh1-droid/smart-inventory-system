// ── middleware/auth.js ────────────────────────────
const jwt  = require('jsonwebtoken');
const { User, Admin } = require('../models');

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: '인증이 필요합니다.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'admin') {
      req.user = await Admin.findById(decoded.id).select('-password');
      if (req.user) req.user.role = 'admin';
    } else {
      req.user = await User.findById(decoded.id).select('-password');
      if (req.user) req.user.role = 'user';
    }
    if (!req.user) return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    next();
  } catch {
    res.status(401).json({ message: '토큰이 만료됐거나 유효하지 않습니다.' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ message: '관리자만 접근할 수 있습니다.' });
  next();
};

module.exports = { protect, adminOnly };
