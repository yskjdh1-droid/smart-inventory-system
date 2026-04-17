# 스마트 학과 기자재 대여 관리 앱

**팀 구성**: 김민석(백엔드1) · 윤동훈(백엔드2) · 안효진(프론트1) · 정건우(프론트2)

## 기술 스택

| 구분 | 기술 |
|------|------|
| 모바일 앱 | React Native + Expo (Android 기반) |
| 백엔드 | Node.js + Express |
| 데이터베이스 | MongoDB + Mongoose |
| 인증 | JWT |
| 알림 | Firebase Cloud Messaging (FCM) |

---

## 프로젝트 구조

```
app/
├── frontend/               # React Native 앱
│   ├── App.js              # 루트 네비게이터
│   ├── app.json            # Expo 설정
│   ├── src/
│   │   ├── api/index.js    # axios + 모든 API 함수
│   │   ├── context/AuthContext.js
│   │   ├── theme.js        # 색상/상태 상수
│   │   ├── navigation/     # MainTabs, AdminTabs
│   │   ├── components/UI.js
│   │   └── screens/
│   │       ├── LoginScreen.js
│   │       ├── EquipmentList.js
│   │       ├── EquipmentDetail.js
│   │       ├── QRScan.js
│   │       ├── MyRentals.js
│   │       ├── Modals.js          # RentModal, ExtendModal, DamageReport
│   │       ├── Pages.js           # Notifications, MyPage
│   │       └── admin/
│   │           ├── Dashboard.js
│   │           ├── Equipment.js
│   │           ├── Rentals.js
│   │           └── Penalty.js
│   └── package.json
│
└── backend/                # Node.js 서버
    ├── server.js           # Express + Cron
    ├── seed.js             # 초기 데이터
    ├── .env.example
    ├── models/index.js     # MongoDB 스키마 전체
    ├── routes/index.js     # 모든 API 라우터
    ├── middleware/auth.js
    └── utils/fcm.js
```

---

## 실행 방법

### 0. 공통 준비
```bash
# MongoDB 로컬 설치 or MongoDB Atlas 사용
# Node.js 18+ 설치 확인
node -v
```

### 1. 백엔드 실행
```bash
cd backend
npm install
cp .env.example .env      # .env 파일 수정 (MONGODB_URI, JWT_SECRET)
node seed.js              # 초기 데이터 생성 (최초 1회)
npm run dev               # nodemon으로 실행 → localhost:5000
```

### 2. 프론트엔드 실행
```bash
cd frontend
npm install
# src/api/index.js 에서 BASE_URL을 본인 PC IP로 변경
# 예: http://192.168.0.10:5000/api
npm start                 # expo start
# 터미널에 QR 코드 뜨면 → 핸드폰 Expo Go 앱으로 스캔
```

### 3. Expo Go 앱 설치
- Android: Play Store에서 "Expo Go" 검색 설치
- 앱 실행 → "Scan QR code" → expo start 터미널의 QR 코드 스캔

---

## 로그인 계정 (seed.js 실행 후)

| 구분 | ID | 비밀번호 |
|------|----|----------|
| 관리자 | admin01 | admin1234 |
| 학생 | 20230041 | test1234 |
| 학생 | 20230042 | test1234 |

---

## 주요 API

| Method | URL | 설명 |
|--------|-----|------|
| POST | /api/auth/login | 학생 로그인 |
| POST | /api/auth/admin/login | 관리자 로그인 |
| POST | /api/auth/register | 학생 회원가입 |
| GET  | /api/equipment | 기자재 목록 (검색/필터) |
| GET  | /api/equipment/:id | 기자재 상세 |
| POST | /api/equipment | 기자재 등록 (관리자) |
| GET  | /api/equipment/:id/qr | QR 코드 조회 |
| GET  | /api/rentals/my | 내 대여 목록 |
| POST | /api/rentals | 대여 신청 |
| PUT  | /api/rentals/:id/return | 반납 처리 |
| PUT  | /api/rentals/:id/extend | 연장 신청/승인 |
| PUT  | /api/rentals/:id/force-return | 강제 반납 (관리자) |
| GET  | /api/admin/stats | 대시보드 통계 |
| GET  | /api/admin/overdue | 연체 목록 |
| POST | /api/admin/penalty | 패널티 부과 |
| POST | /api/reports/damage | 고장/파손 신고 |

---

## 자동화 (서버 Cron)

| 시간 | 동작 |
|------|------|
| 매일 오전 0시 | 연체 상태 자동 전환 + 패널티 자동 부과 |
| 매일 오전 9시 | 반납 D-3, D-1 푸시 알림 발송 |
