# 스마트 학과 기자재 대여 관리 시스템 - 백엔드 API 명세서

## 1. 개요 (Overview)

### 1.1 목적
학과 기자재(노트북, 카메라 등)의 대여/반납 상태를 실시간으로 관리하는 REST API 서비스 제공

### 1.2 기술 스택

#### 백엔드
- **런타임**: Node.js
- **웹 프레임워크**: Express.js
- **데이터베이스**: MongoDB
- **ODM (Object Document Mapper)**: Mongoose
- **인증**: Google OAuth 2.0, Passport.js, JWT (JSON Web Token)
- **API 문서**: Swagger/OpenAPI 3.0
- **푸시 알림**: Firebase Cloud Messaging (FCM)

#### 모바일 단말
- **프레임워크**: React Native
- **상태 관리**: Redux / Context API
- **중앙 데이터 저장소**: AsyncStorage / SQLite
- **HTTP 클라이언트**: Axios / React Query
- **QR 스캐너**: react-native-camera / react-native-vision-camera
- **네비게이션**: React Navigation
- **개발 환경**: VSCode / Android Studio / Xcode

### 1.3 기본 정보
- **Base URL (Production)**: `https://api.inventory-system.com/api`
- **Base URL (Development)**: `http://localhost:3000/api`
- **API Version**: v1
- **응답 포맷**: JSON
- **인증 방식**: Bearer Token (Authorization Header)
- **Timeout**: 30초 (모바일 레이턴시 고려)
- **노출 메커니즘**: Deep Linking, Universal Links

---

## 2. 데이터베이스 스키마 (Database Schema)

### 2.1 주요 엔티티

#### 2.1.1 User (사용자)
```javascript
// User Schema (Mongoose)
const userSchema = new Schema({
  _id: Schema.Types.ObjectId,  // MongoDB 기본 ID
  googleId: {
    type: String,
    required: true,
    unique: true  // Google OAuth ID
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  profileImage: {
    type: String,  // Google 프로필 이미지 URL
    default: null
  },
  role: {
    type: String,
    enum: ['STUDENT', 'ADMIN', 'MANAGER'],
    default: 'STUDENT'
  },
  department: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, { collection: 'users' });

// 인덱스 설정
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ role: 1 });
```

#### 2.1.2 Equipment (기자재)
```javascript
// Equipment Schema (Mongoose)
const equipmentSchema = new Schema({
  _id: Schema.Types.ObjectId,  // MongoDB 기본 ID
  name: {
    type: String,
    required: true  // 기자재명 (e.g., MacBook Pro 13)
  },
  category: {
    type: String,
    required: true  // 분류 (e.g., 노트북, 카메라)
  },
  model: {
    type: String,  // 모델명 (e.g., M1, 2021)
    default: null
  },
  serialNumber: {
    type: String,
    required: true,
    unique: true
  },
  qrCode: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,  // 상세 설명
    default: null
  },
  purchaseDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'BORROWED', 'REPAIR', 'LOST'],
    default: 'AVAILABLE'
  },
  location: {
    type: String,  // 보관 위치
    default: null
  },
  quantity: {
    type: Number,  // 동일 모델 수량
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, { collection: 'equipment' });

// 인덱스 설정
equipmentSchema.index({ serialNumber: 1 });
equipmentSchema.index({ qrCode: 1 });
equipmentSchema.index({ category: 1 });
equipmentSchema.index({ status: 1 });
```

#### 2.1.3 Loan (대여 이력)
```javascript
// Loan Schema (Mongoose)
const loanSchema = new Schema({
  _id: Schema.Types.ObjectId,  // MongoDB 기본 ID
  userId: {
    type: Schema.Types.ObjectId,  // User 컬렉션 참조
    ref: 'User',
    required: true
  },
  equipmentId: {
    type: Schema.Types.ObjectId,  // Equipment 컬렉션 참조
    ref: 'Equipment',
    required: true
  },
  borrowedAt: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,  // 반납 예정일
    required: true
  },
  returnedAt: {
    type: Date,  // 실제 반납일
    default: null
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'RETURNED', 'OVERDUE', 'LOST'],
    default: 'ACTIVE'
  },
  notes: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'loans' });

// 동시 대여 방지: userId + equipmentId (status=ACTIVE일 때 유니크)
loanSchema.index({ userId: 1, equipmentId: 1, status: 1 });
loanSchema.index({ equipmentId: 1, status: 1 });
loanSchema.index({ userId: 1, status: 1 });
loanSchema.index({ dueDate: 1 });
loanSchema.index({ status: 1 });
```
```

#### 2.1.4 RentalRequest (대여 신청)
```javascript
// RentalRequest Schema (Mongoose)
const rentalRequestSchema = new Schema({
  _id: Schema.Types.ObjectId,  // MongoDB 기본 ID
  userId: {
    type: Schema.Types.ObjectId,  // User 컬렉션 참조
    ref: 'User',
    required: true
  },
  equipmentId: {
    type: Schema.Types.ObjectId,  // Equipment 컬렉션 참조
    ref: 'Equipment',
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,  // 대여 예정 반납일
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING'
  },
  reason: {
    type: String,  // 대여 사유
    default: null
  },
  approvedBy: {
    type: Schema.Types.ObjectId,  // 승인자 ID (User 참조)
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'rentalRequests' });

// 인덱스 설정
rentalRequestSchema.index({ userId: 1, status: 1 });
rentalRequestSchema.index({ equipmentId: 1, status: 1 });
rentalRequestSchema.index({ status: 1 });
rentalRequestSchema.index({ requestedAt: -1 });
```
```

#### 2.1.5 RepairRecord (수리 기록)
```javascript
// RepairRecord Schema (Mongoose)
const repairRecordSchema = new Schema({
  _id: Schema.Types.ObjectId,  // MongoDB 기본 ID
  equipmentId: {
    type: Schema.Types.ObjectId,  // Equipment 컬렉션 참조
    ref: 'Equipment',
    required: true
  },
  issue: {
    type: String,  // 수리 사항
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,  // 수리 완료일
    default: null
  },
  cost: {
    type: Number,  // 수리 비용
    default: null
  },
  notes: {
    type: String,  // 추가 설명
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'repairRecords' });

// 인덱스 설정
repairRecordSchema.index({ equipmentId: 1 });
repairRecordSchema.index({ startDate: -1 });
```

---

## 3. API 엔드포인트 (API Endpoints)

### 3.0 백엔드 라우터 구조

백엔드는 Express 기준으로 기능별 라우터를 분리하고, 모든 요청은 공통 미들웨어를 거쳐 각 라우트로 전달합니다.

#### 3.0.1 라우터 트리
```text
/api
├── /auth
│   ├── GET    /google
│   ├── GET    /google/callback
│   ├── POST   /refresh
│   └── POST   /logout
├── /equipment
│   ├── GET    /
│   ├── GET    /:id
│   ├── POST   /
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   └── POST   /:id/generate-qr
├── /loans
│   ├── POST   /scan
│   ├── POST   /:loanId/return
│   ├── POST   /:loanId/extension-requests
│   ├── PATCH  /:loanId/extension-requests/:requestId
│   ├── GET    /my-loans
│   ├── GET    /
│   └── GET    /overdue
├── /rental-requests
│   ├── POST   /
│   ├── GET    /
│   ├── PATCH  /:id/approve
│   └── PATCH  /:id/reject
├── /repairs
│   ├── POST   /
│   ├── PATCH  /:id/complete
│   └── GET    /equipment/:equipmentId
├── /dashboard
│   ├── GET    /equipment-stats
│   ├── GET    /rental-stats
│   └── GET    /monthly-trends
├── /users
│   ├── GET    /
│   ├── GET    /:id
│   ├── PATCH  /:id/role
│   ├── PATCH  /profile
│   └── PATCH  /password
└── /mobile
  ├── GET    /version
  ├── POST   /fcm-token
  ├── POST   /fcm-token/unregister
  ├── GET    /sync-status
  └── GET    /sync-data
```

#### 3.0.2 공통 미들웨어 흐름
```text
Request -> CORS -> JSON Parser -> Request Logger -> Auth Check -> Role Check -> Route Handler -> Error Handler
```

#### 3.0.3 라우터 분리 원칙
- 인증은 `auth.routes.js`
- 기자재는 `equipment.routes.js`
- 대여는 `loans.routes.js`
- 대여 신청은 `rentalRequest.routes.js`
- 수리는 `repair.routes.js`
- 통계는 `dashboard.routes.js`
- 사용자 관리는 `user.routes.js`
- 모바일 연동은 `mobile.routes.js`

#### 3.0.4 권한별 API 요약

**회원용 / 공통 API**
- `GET /auth/google`
- `GET /auth/google/callback`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /equipment`
- `GET /equipment/:id`
- `POST /rental-requests`
- `GET /rental-requests`
- `POST /loans/scan`
- `POST /loans/:loanId/return`
- `POST /loans/:loanId/extension-requests`
- `GET /loans/my-loans`
- `PATCH /users/profile`
- `PATCH /users/password`

**관리자용 API**
- `POST /equipment`
- `PATCH /equipment/:id`
- `DELETE /equipment/:id`
- `POST /equipment/:id/generate-qr`
- `PATCH /rental-requests/:id/approve`
- `PATCH /rental-requests/:id/reject`
- `PATCH /loans/:loanId/extension-requests/:requestId`
- `GET /loans`
- `GET /loans/overdue`
- `POST /repairs`
- `PATCH /repairs/:id/complete`
- `GET /repairs/equipment/:equipmentId`
- `GET /dashboard/equipment-stats`
- `GET /dashboard/rental-stats`
- `GET /dashboard/monthly-trends`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id/role`

권한 검사는 `Auth Check -> Role Check -> Route Handler` 흐름에서 처리하며, 프론트는 로그인한 사용자의 역할에 따라 관리자 화면과 회원 화면을 분리해서 API를 호출합니다.

### 3.1 인증 (Authentication - Google OAuth 2.0)

#### 3.1.1 Google 로그인 요청
**GET** `/auth/google`

**설명**: 사용자를 Google 로그인 페이지로 리다이렉트합니다.

**요청 파라미터:**
```
?redirect_uri=http://localhost:3000/auth/google/callback
```

#### 3.1.2 Google OAuth 콜백
**GET** `/auth/google/callback`

**설명**: Google에서 인증 후 자동으로 콜백되는 엔드포인트입니다.

**응답 (302 Redirect):**
리다이렉트 URL에 포함된 쿼리 파라미터:
```
http://localhost:3000?accessToken=eyJ...&refreshToken=eyJ...&userId=google_123
```

**응답 본문 (JSON):**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "google_abc123def",
      "googleId": "112345678901234567890",
      "email": "student01@gmail.com",
      "name": "홍길동",
      "profileImage": "https://lh3.googleusercontent.com/...",
      "role": "STUDENT"
    }
  }
}
```

#### 3.1.3 토큰 갱신
**POST** `/auth/refresh`

**요청 헤더:**
```
Authorization: Bearer <refreshToken>
```

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "google_abc123def",
      "email": "student01@gmail.com",
      "name": "홍길동",
      "role": "STUDENT"
    }
  }
}
```

#### 3.1.4 로그아웃
**POST** `/auth/logout`

**요청 헤더:**
```
Authorization: Bearer <accessToken>
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 3.2 기자재 관리 (Equipment Management / 회원 조회 + 관리자 관리)

#### 3.2.1 기자재 목록 조회
**GET** `/equipment`

**요청 파라미터:**
- `category` (optional): string - 기자재 분류
- `status` (optional): enum - AVAILABLE, BORROWED, REPAIR, LOST
- `page` (optional): integer - 페이지 번호 (기본값: 1)
- `limit` (optional): integer - 페이지당 결과 수 (기본값: 10)
- `search` (optional): string - 기자재명 검색

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "equipment": [
      {
        "id": 1,
        "name": "MacBook Pro 13",
        "category": "노트북",
        "serialNumber": "SN12345678",
        "qrCode": "QR001",
        "status": "AVAILABLE",
        "location": "학과 사무실 201",
        "quantity": 2,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 10,
      "totalPages": 2
    }
  }
}
```

#### 3.2.2 기자재 상세 조회
**GET** `/equipment/:id`

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "MacBook Pro 13",
    "category": "노트북",
    "model": "M1, 2021",
    "serialNumber": "SN12345678",
    "qrCode": "QR001",
    "description": "고사양 노트북",
    "purchaseDate": "2021-06-15",
    "status": "AVAILABLE",
    "location": "학과 사무실 201",
    "quantity": 2,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 3.2.3 기자재 신규 등록 (ADMIN/MANAGER만)
**POST** `/equipment`

**요청 헤더:**
```
Authorization: Bearer <accessToken>
```

**요청 본문:**
```json
{
  "name": "MacBook Pro 13",
  "category": "노트북",
  "model": "M1, 2021",
  "serialNumber": "SN12345678",
  "description": "고사양 노트북",
  "purchaseDate": "2021-06-15",
  "location": "학과 사무실 201",
  "quantity": 2
}
```

**응답 (201 Created):**
```json
{
  "success": true,
  "message": "Equipment registered successfully",
  "data": {
    "id": 1,
    "name": "MacBook Pro 13",
    "qrCode": "QR001",
    "status": "AVAILABLE",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 3.2.4 기자재 수정 (ADMIN/MANAGER만)
**PATCH** `/equipment/:id`

**요청 본문:**
```json
{
  "location": "학과 사무실 202",
  "quantity": 3
}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "Equipment updated successfully",
  "data": {
    "id": 1,
    "name": "MacBook Pro 13",
    "location": "학과 사무실 202",
    "quantity": 3,
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

#### 3.2.5 기자재 삭제 (ADMIN만)
**DELETE** `/equipment/:id`

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "Equipment deleted successfully"
}
```

#### 3.2.6 QR 코드 생성
**POST** `/equipment/:id/generate-qr`

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "qrCode": "QR001",
    "qrImage": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "equipmentId": 1
  }
}
```

---

### 3.3 대여 신청 (Rental Request / 회원 신청 + 관리자 승인)

#### 3.3.1 대여 신청
**POST** `/rental-requests`

**요청 헤더:**
```
Authorization: Bearer <accessToken>
```

**요청 본문:**
```json
{
  "equipmentId": 1,
  "dueDate": "2024-01-20T18:00:00Z",
  "reason": "프로젝트 촬영 작업"
}
```

**응답 (201 Created):**
```json
{
  "success": true,
  "message": "Rental request submitted successfully",
  "data": {
    "id": 1,
    "userId": 1,
    "equipmentId": 1,
    "dueDate": "2024-01-20T18:00:00Z",
    "status": "PENDING",
    "reason": "프로젝트 촬영 작업",
    "requestedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 3.3.2 대여 신청 목록 조회
**GET** `/rental-requests`

**요청 파라미터:**
- `status` (optional): enum - PENDING, APPROVED, REJECTED, CANCELLED
- `page` (optional): integer
- `limit` (optional): integer

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": 1,
        "userId": 1,
        "user": {
          "name": "홍길동"
        },
        "equipmentId": 1,
        "equipment": {
          "name": "MacBook Pro 13"
        },
        "dueDate": "2024-01-20T18:00:00Z",
        "status": "PENDING",
        "requestedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10
    }
  }
}
```

#### 3.3.3 대여 신청 승인 (ADMIN/MANAGER만)
**PATCH** `/rental-requests/:id/approve`

**요청 본문:**
```json
{
  "approvedAt": "2024-01-15T11:00:00Z"
}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "Rental request approved successfully",
  "data": {
    "id": 1,
    "status": "APPROVED",
    "approvedAt": "2024-01-15T11:00:00Z"
  }
}
```

#### 3.3.4 대여 신청 거절 (ADMIN/MANAGER만)
**PATCH** `/rental-requests/:id/reject`

**요청 본문:**
```json
{
  "rejectionReason": "이미 대여 중인 기자재입니다"
}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "Rental request rejected successfully",
  "data": {
    "id": 1,
    "status": "REJECTED",
    "rejectionReason": "이미 대여 중인 기자재입니다"
  }
}
```

---

### 3.4 대여/반납 관리 (Loan Management / 회원 + 관리자)

#### 3.4.1 영구 QR 코드 스캔 처리
**POST** `/loans/scan`

**요청 헤더:**
```
Authorization: Bearer <accessToken>
```

**요청 본문:**
```json
{
  "qrCode": "QR001",
  "notes": "프로젝트 촬영용"
}
```

**처리 규칙:**
- QR 코드는 기자재 식별용으로 영구 유지된다.
- 같은 기자재에 대해 현재 사용자 기준 ACTIVE 대여가 없고 기자재 상태가 AVAILABLE이면 `대여 처리`
- 같은 기자재에 대해 현재 사용자 기준 ACTIVE 대여가 있으면 `반납 처리`
- 다른 사용자가 대여 중인 경우에는 대여 처리하지 않고 오류를 반환한다.

**응답 - 대여 처리 (201 Created):**
```json
{
  "success": true,
  "message": "Equipment borrowed successfully",
  "data": {
    "action": "BORROW",
    "loanId": 1,
    "userId": 1,
    "equipmentId": 1,
    "equipment": {
      "name": "MacBook Pro 13"
    },
    "borrowedAt": "2024-01-15T10:30:00Z",
    "dueDate": "2024-01-20T18:00:00Z",
    "status": "ACTIVE"
  }
}
```

**응답 - 반납 처리 (200 OK):**
```json
{
  "success": true,
  "message": "Equipment returned successfully",
  "data": {
    "action": "RETURN",
    "loanId": 1,
    "equipmentId": 1,
    "returnedAt": "2024-01-18T14:00:00Z",
    "status": "RETURNED",
    "daysUsed": 3
  }
}
```

**에러 응답 (400/409):**
```json
{
  "success": false,
  "error": "EQUIPMENT_NOT_AVAILABLE",
  "message": "이미 다른 사용자가 대여 중인 기자재입니다"
}
```

#### 3.4.2 수동 반납 처리 (관리자/예외 처리용)
**POST** `/loans/:loanId/return`

**요청 헤더:**
```
Authorization: Bearer <accessToken>
```

**요청 본문:**
```json
{
  "condition": "good",
  "notes": "사용하기 좋았습니다"
}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "Equipment returned successfully",
  "data": {
    "loanId": 1,
    "equipmentId": 1,
    "returnedAt": "2024-01-18T14:00:00Z",
    "status": "RETURNED",
    "daysUsed": 3
  }
}
```

#### 3.4.3 대여 연장 신청
**POST** `/loans/:loanId/extension-requests`

**요청 헤더:**
```
Authorization: Bearer <accessToken>
```

**요청 본문:**
```json
{
  "requestedDueDate": "2024-01-27T18:00:00Z",
  "reason": "프로젝트 일정 지연"
}
```

**응답 (201 Created):**
```json
{
  "success": true,
  "message": "Loan extension request submitted successfully",
  "data": {
    "extensionRequestId": 101,
    "loanId": 1,
    "currentDueDate": "2024-01-20T18:00:00Z",
    "requestedDueDate": "2024-01-27T18:00:00Z",
    "status": "PENDING"
  }
}
```

#### 3.4.4 대여 연장 승인/거절 (ADMIN/MANAGER만)
**PATCH** `/loans/:loanId/extension-requests/:requestId`

**요청 본문:**
```json
{
  "status": "APPROVED",
  "managerNote": "1주 연장 승인"
}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "Loan extension request processed successfully",
  "data": {
    "loanId": 1,
    "previousDueDate": "2024-01-20T18:00:00Z",
    "updatedDueDate": "2024-01-27T18:00:00Z",
    "status": "APPROVED"
  }
}
```

#### 3.4.5 대여 이력 조회 (개인)
**GET** `/loans/my-loans`

**요청 헤더:**
```
Authorization: Bearer <accessToken>
```

**요청 파라미터:**
- `status` (optional): enum - ACTIVE, RETURNED, OVERDUE, LOST
- `page` (optional): integer
- `limit` (optional): integer

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "loans": [
      {
        "id": 1,
        "equipmentId": 1,
        "equipment": {
          "name": "MacBook Pro 13",
          "category": "노트북"
        },
        "borrowedAt": "2024-01-15T10:30:00Z",
        "dueDate": "2024-01-20T18:00:00Z",
        "returnedAt": "2024-01-18T14:00:00Z",
        "status": "RETURNED"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10
    }
  }
}
```

#### 3.4.6 전체 대여 이력 조회 (ADMIN/MANAGER만)
**GET** `/loans`

**요청 파라미터:**
- `userId` (optional): integer - 사용자 ID로 필터링
- `equipmentId` (optional): integer - 기자재 ID로 필터링
- `status` (optional): enum
- `page` (optional): integer
- `limit` (optional): integer

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "loans": [
      {
        "id": 1,
        "user": {
          "id": 1,
          "name": "홍길동",
          "username": "student01"
        },
        "equipment": {
          "id": 1,
          "name": "MacBook Pro 13"
        },
        "borrowedAt": "2024-01-15T10:30:00Z",
        "dueDate": "2024-01-20T18:00:00Z",
        "returnedAt": "2024-01-18T14:00:00Z",
        "status": "RETURNED"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

#### 3.4.7 연체 목록 조회 (ADMIN/MANAGER만)
**GET** `/loans/overdue`

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "overdueLoans": [
      {
        "id": 1,
        "user": {
          "name": "홍길동",
          "email": "hong@example.com"
        },
        "equipment": {
          "name": "MacBook Pro 13"
        },
        "dueDate": "2024-01-20T18:00:00Z",
        "overdueBy": 5,
        "status": "OVERDUE"
      }
    ],
    "total": 3
  }
}
```

---

### 3.5 수리 관리 (Repair Management / 관리자 전용)

#### 3.5.1 수리 기록 생성 (ADMIN/MANAGER만)
**POST** `/repairs`

**요청 본문:**
```json
{
  "equipmentId": 1,
  "issue": "화면 일부가 어둡게 표시됨",
  "cost": 150000,
  "notes": "A/S 센터에서 백라이트 교체"
}
```

**응답 (201 Created):**
```json
{
  "success": true,
  "message": "Repair record created successfully",
  "data": {
    "id": 1,
    "equipmentId": 1,
    "issue": "화면 일부가 어둡게 표시됨",
    "startDate": "2024-01-15T10:30:00Z",
    "cost": 150000,
    "status": "IN_PROGRESS"
  }
}
```

#### 3.5.2 수리 완료 (ADMIN/MANAGER만)
**PATCH** `/repairs/:id/complete`

**요청 본문:**
```json
{
  "endDate": "2024-01-18T15:00:00Z"
}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "Repair completed successfully",
  "data": {
    "id": 1,
    "equipmentId": 1,
    "status": "COMPLETED",
    "endDate": "2024-01-18T15:00:00Z"
  }
}
```

#### 3.5.3 수리 이력 조회
**GET** `/repairs/equipment/:equipmentId`

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "repairs": [
      {
        "id": 1,
        "equipmentId": 1,
        "issue": "화면 일부가 어둡게 표시됨",
        "startDate": "2024-01-15T10:30:00Z",
        "endDate": "2024-01-18T15:00:00Z",
        "cost": 150000,
        "notes": "A/S 센터에서 백라이트 교체"
      }
    ]
  }
}
```

---

### 3.6 통계 및 대시보드 (Statistics & Dashboard / 관리자 전용)

#### 3.6.1 전체 기자재 통계 (ADMIN/MANAGER만)
**GET** `/dashboard/equipment-stats`

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalEquipment": 20,
    "available": 12,
    "borrowed": 5,
    "inRepair": 2,
    "lost": 1,
    "byCategory": {
      "노트북": 10,
      "카메라": 5,
      "촬영장비": 5
    }
  }
}
```

#### 3.6.2 대여 통계 (ADMIN/MANAGER만)
**GET** `/dashboard/rental-stats`

**요청 파라미터:**
- `startDate` (optional): string (ISO 8601)
- `endDate` (optional): string (ISO 8601)

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalRentals": 150,
    "activeRentals": 8,
    "completedRentals": 140,
    "overdueRentals": 2,
    "lostEquipment": 1,
    "mostBorrowedEquipment": [
      {
        "equipmentId": 1,
        "name": "MacBook Pro 13",
        "borrowCount": 25
      }
    ],
    "topBorrowers": [
      {
        "userId": 1,
        "name": "홍길동",
        "borrowCount": 12
      }
    ],
    "averageBorrowDuration": 3.5
  }
}
```

#### 3.6.3 월별 대여 추이 (ADMIN/MANAGER만)
**GET** `/dashboard/monthly-trends`

**요청 파라미터:**
- `months` (optional): integer - 조회 개월 수 (기본값: 12)

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "month": "2024-01",
        "rentals": 15,
        "returns": 14,
        "overdue": 1
      },
      {
        "month": "2024-02",
        "rentals": 18,
        "returns": 17,
        "overdue": 1
      }
    ]
  }
}
```

---

### 3.7 사용자 관리 (User Management / 관리자 + 내 프로필)

#### 3.7.1 사용자 목록 조회 (ADMIN만)
**GET** `/users`

**요청 파라미터:**
- `role` (optional): enum - STUDENT, ADMIN, MANAGER
- `department` (optional): string
- `page` (optional): integer
- `limit` (optional): integer

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "google_abc123def",
        "googleId": "112345678901234567890",
        "email": "student01@gmail.com",
        "name": "홍길동",
        "profileImage": "https://lh3.googleusercontent.com/...",
        "role": "STUDENT",
        "department": "컴퓨터공학과",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10
    }
  }
}
```

#### 3.7.2 사용자 상세 조회
**GET** `/users/:id`

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "google_abc123def",
    "googleId": "112345678901234567890",
    "email": "student01@gmail.com",
    "name": "홍길동",
    "profileImage": "https://lh3.googleusercontent.com/...",
    "role": "STUDENT",
    "department": "컴퓨터공학과",
    "phone": "010-1234-5678",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 3.7.3 사용자 권한 변경 (ADMIN만)
**PATCH** `/users/:id/role`

**요청 본문:**
```json
{
  "role": "MANAGER"
}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "User role updated successfully",
  "data": {
    "id": "google_abc123def",
    "role": "MANAGER"
  }
}
```

#### 3.7.4 프로필 수정
**PATCH** `/users/profile`

**요청 헤더:**
```
Authorization: Bearer <accessToken>
```

**요청 본문:**
```json
{
  "phone": "010-1234-5678",
  "department": "컴퓨터공학과"
}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "google_abc123def",
    "email": "student01@gmail.com",
    "name": "홍길동",
    "phone": "010-1234-5678",
    "department": "컴퓨터공학과"
  }
}
```

---

## 4. 오류 처리 (Error Handling)

### 4.1 표준 오류 응답 형식

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "사람이 읽을 수 있는 오류 메시지",
  "details": {
    "field": "오류 세부사항 (선택사항)"
  }
}
```

### 4.2 HTTP 상태 코드

| 상태 코드 | 설명 |
|---------|------|
| 200 | OK - 요청 성공 |
| 201 | Created - 리소스 생성 성공 |
| 400 | Bad Request - 요청 형식 오류 |
| 401 | Unauthorized - 인증 실패 |
| 403 | Forbidden - 권한 없음 |
| 404 | Not Found - 리소스 없음 |
| 409 | Conflict - 논리적 충돌 (예: 중복 대여) |
| 422 | Unprocessable Entity - 유효성 검사 실패 |
| 500 | Internal Server Error - 서버 오류 |

### 4.3 주요 오류 코드

| 오류 코드 | HTTP 상태 | 설명 |
|---------|---------|------|
| OAUTH_FAILED | 401 | Google OAuth 인증 실패 |
| TOKEN_EXPIRED | 401 | 토큰 만료 |
| UNAUTHORIZED | 403 | 권한 없음 |
| EQUIPMENT_NOT_AVAILABLE | 400 | 기자재 사용 불가능 |
| EQUIPMENT_NOT_FOUND | 404 | 기자재 없음 |
| USER_NOT_FOUND | 404 | 사용자 없음 |
| DUPLICATE_BORROW | 409 | 중복 대여 시도 |
| EXTENSION_NOT_ALLOWED | 400 | 연장 불가 상태 |
| EXTENSION_REQUEST_DUPLICATED | 409 | 미처리 연장 신청 중복 |
| VALIDATION_ERROR | 422 | 유효성 검사 실패 |

---

## 5. 보안 (Security)

### 5.1 인증 (Google OAuth 2.0)
- Google OAuth 2.0 기반 로그인
- Passport.js를 이용한 소셜 로그인 구현
- JWT (JSON Web Token) 기반 세션 관리
- Access Token 만료 시간: 1시간
- Refresh Token 만료 시간: 7일
- Bearer Token 형식으로 Authorization 헤더 사용
- 첫 로그인 시 자동으로 사용자 계정 생성

### 5.2 권한 제어 (RBAC)
- **STUDENT**: 자신의 대여/반납 조회만 가능
- **MANAGER**: 기자재 관리, 대여 신청 승인/거절, 통계 조회 가능
- **ADMIN**: 모든 기능 접근 가능

### 5.3 동시성 제어
- 동일 기자재에 대한 중복 대여 방지 (MongoDB 인덱스 + Mongoose 트랜잭션)
- Optimistic/Pessimistic Lock 패턴 적용

### 5.4 데이터 보호
- Google OAuth 토큰 안전 저장
- 민감한 정보 로깅 금지
- HTTPS 필수 사용 (프로덕션)
- CSRF 토큰 검증 (쿠키 기반 저장)

---

## 6. 스케줄러/배경 작업 (Scheduled Tasks)

### 6.1 자동 연체 처리
- **실행 시간**: 매일 자정
- **기능**: dueDate가 경과한 대여의 status를 OVERDUE로 변경

### 6.2 반납 하루 전 자동 알림 발송
- **실행 시간**: 매일 오전 10시
- **기능**: 반납 예정일 24시간 전인 ACTIVE 대여 건에 대해 자동 알림 발송
- **채널**: FCM 푸시(기본), 이메일(FCM 토큰 미등록 사용자)
- **중복 방지**: 같은 대여 건에 대해 하루 1회만 발송

---

## 7. API 사용 예제 (Examples)

### 7.1 Google 로그인 플로우

```
1. 사용자가 "Google로 로그인" 버튼 클릭
   GET /api/auth/google
   → Google 로그인 페이지로 리다이렉트

2. 사용자가 Google 계정으로 로그인
   → Google OAuth 권한 허용

3. Google 콜백
   GET /api/auth/google/callback?code=...
   → 자동으로 사용자 계정 생성 또는 기존 계정 조회

4. 토큰 발급
   → accessToken, refreshToken 발급
   → 프론트엔드로 리다이렉트 (토큰 포함)

5. 이후 모든 API 요청에 accessToken 사용
   Authorization: Bearer <accessToken>
```

### 7.2 QR 스캔을 통한 대여/반납 프로세스

```
1. 사용자가 Google로 로그인
  → accessToken 획득

2. 사용자가 기자재에 붙은 영구 QR 코드 스캔
  → qrCode 추출

3. 첫 번째 스캔에서 상태 확인 후 대여 처리
  POST /loans/scan
   Authorization: Bearer <accessToken>
   {
    "qrCode": "QR001",
    "notes": "프로젝트 촬영"
   }
  → 서버가 현재 대여 상태를 확인한 뒤 AVAILABLE이면 BORROW, 대여 중이면 RETURN 판단

4. 다시 같은 QR을 스캔하면 반납 처리
  POST /loans/scan
   Authorization: Bearer <accessToken>
   {
    "qrCode": "QR001",
    "notes": "정상 반납"
   }
  → 서버가 현재 ACTIVE 대여를 찾아 RETURN 처리
```

### 7.3 대여 연장 신청 플로우

```
1. 사용자가 현재 ACTIVE 대여 건 조회
  GET /loans/my-loans?status=ACTIVE

2. 연장 신청 생성
  POST /loans/{loanId}/extension-requests
  {
    "requestedDueDate": "2024-01-27T18:00:00Z",
    "reason": "프로젝트 일정 지연"
  }

3. 관리자가 승인/거절
  PATCH /loans/{loanId}/extension-requests/{requestId}
  {
    "status": "APPROVED"
  }

4. 승인 시 dueDate 자동 갱신
```

### 7.4 관리자 대시보드 데이터 조회

```
1. 기자재 통계 조회
   GET /dashboard/equipment-stats

2. 대여 통계 조회
   GET /dashboard/rental-stats

3. 월별 추이 조회
   GET /dashboard/monthly-trends?months=6

4. 연체 목록 조회
   GET /loans/overdue
```

---

## 8. 배포 및 환경 설정

### 8.0 권장 배포 구성 (초기 운영)
- **백엔드**: Railway (Node.js API 배포)
- **데이터베이스**: MongoDB Atlas (M0 또는 M2)
- **자동 배포**: GitHub Actions + Railway Deploy Hook
- **모바일 앱**: React Native (배포는 별도 스토어 파이프라인)

이 구성은 초보자 기준 설정이 단순하고, 무료/저비용으로 시작하기 쉽습니다.

### 8.1 환경 변수 (.env)

```
# 서버
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:3000

# MongoDB 데이터베이스
MONGODB_URI=mongodb://localhost:27017/inventory_db
MONGODB_USER=admin
MONGODB_PASSWORD=your_password
# 또는 MongoDB Atlas 클라우드
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/inventory_db?retryWrites=true&w=majority

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# 메일 (알림용)
MAIL_SERVICE=gmail
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password

# QR 코드
QR_SIZE=200
QR_ERROR_CORRECTION=H

# Mongoose 옵션
MONGOOSE_CONNECT_TIMEOUT=10000
MONGOOSE_USE_NEW_URL_PARSER=true
MONGOOSE_USE_CREATE_INDEX=true
```

### 8.2 프로덕션 체크리스트

- [ ] NODE_ENV를 production으로 설정
- [ ] HTTPS 적용
- [ ] CORS 설정 확인
- [ ] Rate Limiting 설정
- [ ] 환경 변수 보안 강화
- [ ] 데이터베이스 백업 설정
- [ ] 로그 및 모니터링 설정
- [ ] 보안 헤더 설정 (Helmet.js)

### 8.3 Railway + MongoDB Atlas 배포 절차

1. MongoDB Atlas에서 `inventory_db` 클러스터 생성 후 `MONGODB_URI` 발급
2. Railway 프로젝트 생성 후 GitHub 저장소 연결
3. Railway Variables에 필수 환경 변수 등록
4. Build Command: `npm ci && npm run build` (빌드 스텝이 없으면 `npm ci`)
5. Start Command: `npm run start`
6. Health Check Path: `/api/health`
7. 배포 후 Google OAuth 승인 리디렉션 URI를 운영 도메인으로 갱신
8. GitHub main 브랜치 push 시 자동 배포 확인

### 8.4 필수 운영 환경 변수

- `NODE_ENV=production`
- `PORT=3000`
- `MONGODB_URI=<Atlas URI>`
- `JWT_SECRET=<strong-random-secret>`
- `JWT_ACCESS_EXPIRY=1h`
- `JWT_REFRESH_EXPIRY=7d`
- `GOOGLE_CLIENT_ID=<google-client-id>`
- `GOOGLE_CLIENT_SECRET=<google-client-secret>`
- `GOOGLE_CALLBACK_URL=https://<railway-domain>/api/auth/google/callback`
- `CLIENT_URL=<react-native-app-auth-redirect-or-web-url>`

---

## 9. 참고사항 (Notes)

### 9.1 응답 시간 SLA
- 일반 조회: 200ms 이하
- 대여/반납 처리: 500ms 이하
- 대시보드 통계: 1초 이하

### 9.2 데이터 보관 정책
- 대여 이력: 영구 보관 (감사 추적)
- 삭제된 기자재/사용자: 소프트 삭제 (deletedAt 필드 사용)
- 수리 기록: 1년 이상 보관

### 9.3 향후 확장 사항
- [x] 모바일 앱 API 지원
- [x] 반납 하루 전 자동 알림 (FCM/이메일)
- [ ] 기자재 예약 기능
- [ ] 벌금 시스템
- [ ] 다국어 지원 (i18n)
- [ ] 고급 통계 및 리포팅

---

## 10. MongoDB 데이터베이스 설정

### 10.1 MongoDB 설치 및 시작

#### 로컬 설치 (Windows)
```bash
# MongoDB 설치 후 서비스 시작
net start MongoDB

# 또는 MongoDB Community Edition 설치
# https://www.mongodb.com/try/download/community

# 로컬 연결 확인
mongosh  # MongoDB Shell로 접속
```

#### MongoDB Atlas (클라우드)
```bash
# MongoDB Atlas 계정 생성
# https://www.mongodb.com/cloud/atlas

# 클러스터 생성 후 연결 URL 설정
# mongodb+srv://username:password@cluster.mongodb.net/inventory_db?retryWrites=true&w=majority
```

### 10.2 컬렉션 생성 및 인덱스 설정

```javascript
// Mongoose 모델 로드 시 자동으로 컬렉션 생성
// 필요한 경우 수동으로 아래 명령 실행

// 사용자 컬렉션 인덱스
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ googleId: 1 }, { unique: true })
db.users.createIndex({ role: 1 })

// 기자재 컬렉션 인덱스
db.equipment.createIndex({ serialNumber: 1 }, { unique: true })
db.equipment.createIndex({ qrCode: 1 }, { unique: true })
db.equipment.createIndex({ category: 1 })
db.equipment.createIndex({ status: 1 })

// 대여 이력 컬렉션 인덱스
db.loans.createIndex({ userId: 1, equipmentId: 1, status: 1 })
db.loans.createIndex({ equipmentId: 1, status: 1 })
db.loans.createIndex({ userId: 1, status: 1 })
db.loans.createIndex({ dueDate: 1 })
db.loans.createIndex({ status: 1 })

// 대여 신청 컬렉션 인덱스
db.rentalRequests.createIndex({ userId: 1, status: 1 })
db.rentalRequests.createIndex({ equipmentId: 1, status: 1 })
db.rentalRequests.createIndex({ status: 1 })
db.rentalRequests.createIndex({ requestedAt: -1 })

// 수리 기록 컬렉션 인덱스
db.repairRecords.createIndex({ equipmentId: 1 })
db.repairRecords.createIndex({ startDate: -1 })
```

### 10.3 Mongoose 연결 설정 (Node.js)

```javascript
// db.js 또는 config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority'
    });
    console.log('MongoDB 연결 성공');
  } catch (error) {
    console.error('MongoDB 연결 실패:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### 10.4 MongoDB vs PostgreSQL 비교

| 항목 | MongoDB | PostgreSQL |
|-----|---------|-----------|
| 데이터 모델 | Document (JSON) | Relational (Table) |
| 스키마 | Flexible | Rigid |
| 조인 | 제한적 ($lookup) | 강력 |
| 트랜잭션 | 지원 (4.0+) | 완벽 지원 |
| 인덱싱 | 유연한 인덱싱 | 강력한 인덱싱 |
| 확장성 | Sharding 용이 | 수직 확장 주로 |
| 용도 | 비정형 데이터, 빠른 개발 | 정형 데이터, 복잡한 쿼리 |

### 10.5 MongoDB 최적화 팁

#### 1. 적절한 인덱스 생성
```javascript
// 자주 조회하는 필드에 인덱스 생성
db.loans.createIndex({ userId: 1, status: 1 })

// 복합 인덱스 (Compound Index)
db.equipment.createIndex({ category: 1, status: 1 })
```

#### 2. 쿼리 성능 분석
```javascript
// explain()을 사용해 실행 계획 확인
db.loans.find({ userId: ObjectId(...), status: 'ACTIVE' }).explain('executionStats')
```

#### 3. 배치 작업
```javascript
// 많은 문서 삽입 시 insertMany 사용
await Loan.insertMany(loanArray, { ordered: false })
```

#### 4. 집계 파이프라인 활용
```javascript
// 통계 데이터 조회
const stats = await Loan.aggregate([
  { $match: { status: 'RETURNED' } },
  { $group: {
    _id: '$userId',
    count: { $sum: 1 },
    avgDuration: { $avg: { /* duration 계산 */ } }
  }}
]);
```

### 10.6 백업 및 복구

#### LocalHost MongoDB 백업
```bash
# 데이터베이스 백업
mongodump --db inventory_db --out ./backup

# 데이터 복구
mongorestore --db inventory_db ./backup/inventory_db
```

#### MongoDB Atlas 백업
- 자동 백업 설정 (매일/주단위)
- Atlas UI에서 스냅샷 관리
- 비용: 초과 스토리지에 대해 청구

- 비용: 초과 스토리지에 대해 청구

---

## 11. React Native 모바일 앱 통합

### 11.1 Deep Linking 및 Universal Links 설정

#### Deep Linking (Android)
```xml
<!-- AndroidManifest.xml -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="app"
        android:host="inventory"
        android:pathPrefix="/equipment" />
</intent-filter>

<!-- 예: app://inventory/equipment/123 -->
```

#### Universal Links (iOS)
```json
// apple-app-site-association (웹서버 배포)
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "6P2NL5ZXPH.com.smartinventory.app",
        "paths": ["/equipment/*", "/loans/*", "/auth/*"]
      }
    ]
  }
}

<!-- 예: https://inventory-system.com/equipment/123 -->
```

### 11.2 모바일 앱 특화 엔드포인트

#### 11.2.1 앱 버전 확인
**GET** `/mobile/version`

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "latestVersion": "1.2.0",
    "minimumVersion": "1.0.0",
    "currentVersion": "1.1.5",
    "updateRequired": true,
    "updateUrl": "https://play.google.com/store/apps/details?id=com.smartinventory.app",
    "releaseNotes": "새로운 기능 추가 및 버그 수정"
  }
}
```

#### 11.2.2 푸시 알림 등록
**POST** `/mobile/fcm-token`

**요청 헤더:**
```
Authorization: Bearer <accessToken>
```

**요청 본문:**
```json
{
  "fcmToken": "eKzPmJ3dL5nM9qR2xY8vH4aB6cF7gJ1iO0pL9mN8oQ5rS3t",
  "deviceType": "android",  // ios 또는 android
  "deviceModel": "Samsung Galaxy S21",
  "osVersion": "12.0"
}
```

**응답 (201 Created):**
```json
{
  "success": true,
  "message": "FCM token registered successfully",
  "data": {
    "tokenId": "token_12345",
    "registered": true
  }
}
```

#### 11.2.3 푸시 알림 해제
**POST** `/mobile/fcm-token/unregister`

**요청 헤더:**
```
Authorization: Bearer <accessToken>
```

**요청 본문:**
```json
{
  "fcmToken": "eKzPmJ3dL5nM9qR2xY8vH4aB6cF7gJ1iO0pL9mN8oQ5rS3t"
}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "FCM token unregistered successfully"
}
```

### 11.3 오프라인 데이터 동기화

#### 11.3.1 동기화 상태 확인
**GET** `/mobile/sync-status`

**요청 헤더:**
```
Authorization: Bearer <accessToken>
```

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "lastSyncTime": "2024-01-15T10:30:00Z",
    "pendingChanges": 3,
    "equipmentCount": 25,
    "loansCount": 12,
    "rentalRequestsCount": 5,
    "syncRequired": false
  }
}
```

#### 11.3.2 초기 동기화 데이터
**GET** `/mobile/sync-data`

**요청 파라미터:**
- `lastSyncTime` (optional): ISO 8601 형식의 마지막 동기화 시간

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "equipment": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "MacBook Pro 13",
        "status": "AVAILABLE",
        "qrCode": "QR001"
      }
    ],
    "loans": [
      {
        "id": "507f1f77bcf86cd799439012",
        "equipmentId": "507f1f77bcf86cd799439011",
        "status": "ACTIVE",
        "dueDate": "2024-01-20T18:00:00Z"
      }
    ],
    "rentalRequests": [],
    "lastSyncTime": "2024-01-15T10:30:00Z"
  }
}
```

### 11.4 모바일 특화 응답 최적화

#### 응답 포맷 (경량화)
```json
{
  "success": true,
  "data": { /* 필수 데이터만 포함 */ },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"  // 오프라인 재시도용
  },
  "errors": null  // 에러만 있을 때만 포함
}
```

#### 세션 유지 (Silent Refresh)
```javascript
// 모바일 클라이언트
// 1. Access Token 만료 감지 (401 응답)
// 2. Refresh Token으로 새 Access Token 요청
// 3. 원본 요청 재시도

POST /auth/refresh
{
  "refreshToken": "eyJ..."
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "expiresIn": 3600
  }
}
```

### 11.5 모바일 앱 API 사용 가이드 (React Native)

#### Axios 설정
```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiClient = axios.create({
  baseURL: 'https://api.inventory-system.com/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor (자동 재인증)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      
      try {
        const { data } = await apiClient.post('/auth/refresh', {
          refreshToken,
        });
        
        await AsyncStorage.setItem('accessToken', data.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiClient(originalRequest);
      } catch (err) {
        // 로그인 페이지로 리다이렉트
        return Promise.reject(err);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

#### QR 스캔 예제
```javascript
import { Camera } from 'react-native-camera';
import RNQRGenerator from 'rn-qr-generator';

const scanQRCode = async () => {
  const { result } = await Camera.capture({
    target: Camera.Constants.Type.back,
  });
  
  // QR 코드에서 qrCode 추출
  const qrCode = parseQRData(result);
  
  // 서버가 현재 상태를 보고 대여/반납을 결정
  try {
    const response = await apiClient.post('/loans/scan', {
      qrCode,
      notes: '학과 프로젝트',
    });
    
    console.log('스캔 처리 성공:', response.data.data.action);
  } catch (error) {
    console.error('스캔 처리 실패:', error);
  }
};
```

#### 오프라인 동기화 예제
```javascript
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useSyncData = () => {
  const [isSynced, setIsSynced] = useState(false);
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected && !isSynced) {
        await syncDataWithServer();
        setIsSynced(true);
      } else if (!state.isConnected) {
        setIsSynced(false);
      }
    });
    
    return () => unsubscribe();
  }, [isSynced]);
  
  const syncDataWithServer = async () => {
    try {
      const lastSyncTime = await AsyncStorage.getItem('lastSyncTime');
      const response = await apiClient.get('/mobile/sync-data', {
        params: { lastSyncTime },
      });
      
      // 로컬 저장소에 데이터 저장
      await AsyncStorage.setItem(
        'equipment',
        JSON.stringify(response.data.data.equipment)
      );
      await AsyncStorage.setItem(
        'lastSyncTime',
        response.data.data.lastSyncTime
      );
      
    } catch (error) {
      console.error('동기화 실패:', error);
    }
  };
  
  return { isSynced, syncDataWithServer };
};
```

### 11.6 모바일 보안 고려사항

#### 토큰 저장 (안전한 방식)
```javascript
// AsyncStorage는 암호화되지 않음 - 민감한 데이터는 제외
// 토큰은 앱 앱에서 메모리에만 보관하거나
// react-native-keychain 사용 권장

import * as SecureStore from 'expo-secure-store';

// 토큰 저장
await SecureStore.setItemAsync('accessToken', token);

// 토큰 조회
const token = await SecureStore.getItemAsync('accessToken');
```

#### 네트워크 보안
```javascript
// HTTPS 필수 (프로덕션)
// Certificate Pinning 권장
import { fetch } from '@react-native-ssl-pinning';

const options = {
  cert: 'cert_name',  // 앱에 번들된 인증서
  trustAssets: ['cert.cer'],
};

const response = await fetch('https://api.inventory-system.com/api/...', options);
```

#### 율 제한 (Rate Limiting) 처리
```javascript
const withRateLimit = async (fn, maxRetries = 3) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429) {  // Too Many Requests
        const retryAfter = error.response.headers['retry-after'] || 5;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        retries++;
      } else {
        throw error;
      }
    }
  }
};
```

---

## 12. Swagger/OpenAPI 문서

API 문서는 다음 경로에서 Swagger UI로 확인할 수 있습니다:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI JSON**: `http://localhost:3000/api-docs.json`

---

**문서 버전**: 1.2 (QR 토글/연장/자동알림/배포 반영)
**마지막 수정 날짜**: 2026-04-13  
**작성자**: 백엔드 팀
