require('dotenv').config();
const mongoose = require('mongoose');
const { Equipment, Category, Admin } = require('./models');

async function addEquipment() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('DB 연결됨');

  const admin = await Admin.findOne();

  // 카테고리 추가
  const peripheralCat = await Category.findOneAndUpdate(
    { name: '주변기기' },
    { name: '주변기기', maxRentalDays: 5 },
    { upsert: true, new: true }
  );
  const tripodCat = await Category.findOneAndUpdate(
    { name: '촬영 장비' },
    { name: '촬영 장비', maxRentalDays: 3 },
    { upsert: true, new: true }
  );
  const networkCat = await Category.findOneAndUpdate(
    { name: '네트워크 장비' },
    { name: '네트워크 장비', maxRentalDays: 7 },
    { upsert: true, new: true }
  );
  const officeCat = await Category.findOneAndUpdate(
    { name: '사무용품' },
    { name: '사무용품', maxRentalDays: 3 },
    { upsert: true, new: true }
  );

  const newEquipment = [
    // 주변기기
    { category: peripheralCat._id, serialNumber: 'MS-001',  modelName: '로지텍 MX Master 3 마우스',  maxRentalDays: 5 },
    { category: peripheralCat._id, serialNumber: 'MS-002',  modelName: '애플 Magic Mouse',           maxRentalDays: 5 },
    { category: peripheralCat._id, serialNumber: 'KB-001',  modelName: '로지텍 MX Keys 키보드',      maxRentalDays: 5 },
    { category: peripheralCat._id, serialNumber: 'KB-002',  modelName: '애플 Magic Keyboard',        maxRentalDays: 5 },
    { category: peripheralCat._id, serialNumber: 'MON-001', modelName: 'LG 27인치 4K 모니터',        maxRentalDays: 7 },
    { category: peripheralCat._id, serialNumber: 'MON-002', modelName: 'Dell 24인치 FHD 모니터',     maxRentalDays: 7 },
    { category: peripheralCat._id, serialNumber: 'HUB-001', modelName: 'USB-C 허브 7포트',           maxRentalDays: 3 },
    { category: peripheralCat._id, serialNumber: 'PAD-001', modelName: '와콤 인튜어스 타블렛',       maxRentalDays: 5 },

    // 촬영 장비
    { category: tripodCat._id, serialNumber: 'TRP-001', modelName: '맨프로토 삼각대 190X',           maxRentalDays: 3 },
    { category: tripodCat._id, serialNumber: 'TRP-002', modelName: '고릴라포드 미니 삼각대',         maxRentalDays: 3 },
    { category: tripodCat._id, serialNumber: 'LGT-001', modelName: 'LED 링 조명 (18인치)',           maxRentalDays: 3 },
    { category: tripodCat._id, serialNumber: 'LGT-002', modelName: 'LED 패널 조명 세트',            maxRentalDays: 3 },
    { category: tripodCat._id, serialNumber: 'GRP-001', modelName: 'GoPro Hero 12',                 maxRentalDays: 3 },
    { category: tripodCat._id, serialNumber: 'GRP-002', modelName: 'DJI 오즈모 포켓 3',             maxRentalDays: 3 },
    { category: tripodCat._id, serialNumber: 'LNS-001', modelName: '소니 50mm F1.8 렌즈',           maxRentalDays: 3 },

    // 네트워크 장비
    { category: networkCat._id, serialNumber: 'RT-001',  modelName: '공유기 (ASUS RT-AX88U)',        maxRentalDays: 7 },
    { category: networkCat._id, serialNumber: 'SW-001',  modelName: '8포트 스위치허브',              maxRentalDays: 7 },
    { category: networkCat._id, serialNumber: 'RPi-001', modelName: '라즈베리파이 4B (8GB)',         maxRentalDays: 7 },
    { category: networkCat._id, serialNumber: 'ARD-001', modelName: '아두이노 메가 키트',            maxRentalDays: 7 },

    // 사무용품
    { category: officeCat._id, serialNumber: 'PRJ-001', modelName: 'EPSON 빔프로젝터 EB-X51',       maxRentalDays: 3 },
    { category: officeCat._id, serialNumber: 'PRJ-002', modelName: 'LG 미니빔 PF50KS',              maxRentalDays: 3 },
    { category: officeCat._id, serialNumber: 'SCN-001', modelName: '캐논 스캐너 CanoScan',          maxRentalDays: 3 },
    { category: officeCat._id, serialNumber: 'PRT-001', modelName: '캐논 컬러 레이저 프린터',       maxRentalDays: 3 },
    { category: officeCat._id, serialNumber: 'LAM-001', modelName: '코팅기 A4',                     maxRentalDays: 1 },
    { category: officeCat._id, serialNumber: 'SHR-001', modelName: '문서 세단기',                   maxRentalDays: 1 },
    { category: officeCat._id, serialNumber: 'WBD-001', modelName: '화이트보드 이동식',             maxRentalDays: 3 },
    { category: officeCat._id, serialNumber: 'EXT-001', modelName: '멀티탭 (6구 5m)',               maxRentalDays: 3 },
    { category: officeCat._id, serialNumber: 'EXT-002', modelName: '멀티탭 (8구 3m)',               maxRentalDays: 3 },
    { category: officeCat._id, serialNumber: 'CAL-001', modelName: '공학용 계산기 (CASIO fx-570)',  maxRentalDays: 3 },
    { category: officeCat._id, serialNumber: 'PTR-001', modelName: '레이저 포인터',                 maxRentalDays: 1 },
    { category: officeCat._id, serialNumber: 'SPK-001', modelName: '블루투스 스피커 (JBL Flip 6)', maxRentalDays: 3 },
  ];

  const QRCode = require('qrcode');
  let added = 0;

  for (const e of newEquipment) {
    try {
      const item = await Equipment.create({ ...e, managedBy: admin._id });
      item.qrCodeUrl = await QRCode.toDataURL(`http://localhost:3000/equipment/${item._id}`);
      await item.save();
      console.log(`✅ 추가: ${item.modelName}`);
      added++;
    } catch (err) {
      if (err.code === 11000) {
        console.log(`⚠️ 이미 존재: ${e.serialNumber}`);
      } else {
        console.error(`❌ 오류: ${e.modelName}`, err.message);
      }
    }
  }

  console.log(`\n완료! 총 ${added}개 기자재 추가됐습니다.`);
  process.exit(0);
}

addEquipment().catch((e) => { console.error(e); process.exit(1); });
