// 초기 데이터 세팅 스크립트
// 실행: node seed.js

require('dotenv').config();
const mongoose = require('mongoose');
const { User, Admin, Category, Equipment } = require('./models');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('DB 연결됨');

  // 카테고리
  const cats = await Category.insertMany([
    { name: '노트북',   maxRentalDays: 7,  iconColor: '#028090' },
    { name: '카메라',   maxRentalDays: 3,  iconColor: '#5E60CE' },
    { name: '태블릿',   maxRentalDays: 7,  iconColor: '#F77F00' },
    { name: '음향 장비', maxRentalDays: 5, iconColor: '#A32D2D' },
  ]);
  console.log('카테고리 생성:', cats.map(c => c.name));

  // 관리자 계정
  const admin = await Admin.create({
    adminId: 'admin01', name: '관리자', email: 'admin@univ.ac.kr',
    password: 'admin1234', department: '컴퓨터공학과', level: 'SUPER',
  });
  console.log('관리자 생성:', admin.adminId);

  // 테스트 학생 계정
  const users = await User.insertMany([
    { studentId: '20230041', name: '김민석', email: 'ms@univ.ac.kr', password: 'test1234', phone: '010-1234-5678' },
    { studentId: '20230042', name: '윤동훈', email: 'dh@univ.ac.kr', password: 'test1234', phone: '010-2345-6789' },
    { studentId: '20230043', name: '안효진', email: 'hj@univ.ac.kr', password: 'test1234', phone: '010-3456-7890' },
    { studentId: '20230044', name: '정건우', email: 'gw@univ.ac.kr', password: 'test1234', phone: '010-4567-8901' },
  ]);
  console.log('학생 생성:', users.map(u => u.studentId));

  // 기자재
  const QRCode = require('qrcode');
  const equips = [
    { category: cats[0]._id, serialNumber: 'NB-001', modelName: 'MacBook Air 13 (M2)', managedBy: admin._id },
    { category: cats[0]._id, serialNumber: 'NB-002', modelName: 'MacBook Pro 14 (M3)', managedBy: admin._id },
    { category: cats[0]._id, serialNumber: 'NB-003', modelName: 'LG Gram 16',          managedBy: admin._id },
    { category: cats[1]._id, serialNumber: 'CAM-001', modelName: 'Sony A7 III',         managedBy: admin._id },
    { category: cats[1]._id, serialNumber: 'CAM-002', modelName: 'Canon EOS R',         managedBy: admin._id },
    { category: cats[2]._id, serialNumber: 'TB-001', modelName: 'iPad Pro 11 (4세대)',  managedBy: admin._id },
    { category: cats[2]._id, serialNumber: 'TB-002', modelName: 'Galaxy Tab S9',        managedBy: admin._id },
    { category: cats[3]._id, serialNumber: 'MIC-001', modelName: 'Blue Yeti X',         managedBy: admin._id },
  ];
  for (const e of equips) {
    const item = await Equipment.create(e);
    item.qrCodeUrl = await QRCode.toDataURL(`http://localhost:3000/equipment/${item._id}`);
    await item.save();
  }
  console.log('기자재 생성:', equips.length, '건');

  console.log('\n✅ 시드 완료!');
  console.log('관리자 로그인: adminId=admin01 / password=admin1234');
  console.log('학생 로그인:   studentId=20230041 / password=test1234');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
