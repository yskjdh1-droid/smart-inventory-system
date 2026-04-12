const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. 미들웨어 설정
app.use(cors());
app.use(express.json()); // JSON 데이터 파싱용

// 2. 데이터 모델 정의 (Schema)
const EquipmentSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  category: String,
  status: { type: String, default: 'available' },
  location: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});

const Equipment = mongoose.model('Equipment', EquipmentSchema, 'equipments');

// 3. API 라우터 설정

// [GET] 메인 페이지 테스트
app.get('/', (req, res) => {
  res.send('스마트 기자재 관리 서버 작동 중!');
});

// [GET] 전체 기자재 목록 가져오기
app.get('/api/equipments', async (req, res) => {
  try {
    const equipments = await Equipment.find();
    res.json(equipments);
  } catch (err) {
    res.status(500).json({ message: "데이터를 가져오는데 실패했습니다.", error: err });
  }
});

// [POST] 새로운 기자재 등록 + QR 코드 생성
app.post('/api/equipments', async (req, res) => {
  try {
    // 1. 먼저 DB에 저장할 객체 만들기 (qrCode 필드 추가)
    const newEquipment = new Equipment({
      itemName: req.body.itemName,
      category: req.body.category,
      location: req.body.location,
      description: req.body.description
    });

    // 2. DB에 임시 저장하여 고유 ID(_id) 확보
    const savedDoc = await newEquipment.save();

    // 3. ID를 담은 QR 코드 생성 (텍스트 -> 이미지 데이터)
    // 예: "http://우리서버주소/rent/64d... (ID값)"
    const qrData = `https://smart-inventory.com/rent/${savedDoc._id}`; 
    const qrImage = await QRCode.toDataURL(qrData);

    // 4. 생성된 QR 이미지를 다시 DB에 업데이트
    savedDoc.qrCode = qrImage;
    await savedDoc.save();

    res.status(201).json(savedDoc);
  } catch (err) {
    res.status(400).json({ message: "등록 및 QR 생성 실패", error: err });
  }
});

// 4. DB 연결 및 서버 시작
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB 연결 성공!");
    app.listen(PORT, () => {
      console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    });
  })
  .catch(err => {
    console.error("❌ DB 연결 실패:", err);
  });
