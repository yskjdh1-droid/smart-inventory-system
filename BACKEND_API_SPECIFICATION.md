# 스마트 학과 기자재 대여 관리 시스템 - 백엔드 API 명세서

## 1. 개요

### 1.1 목적
학과 기자재(노트북, 카메라 등)의 대여/반납 상태를 관리하는 REST API를 제공한다.

### 1.2 핵심 변경 사항
- 인증 방식: Google 로그인 제거
- 회원가입 방식: 이메일 인증코드 기반 가입
- 데이터베이스: MongoDB

### 1.3 기술 스택
- Runtime: Node.js
- Framework: Express.js
- DB: MongoDB
- ODM: Mongoose
- Auth: JWT (Access/Refresh)
- Password Hash: bcrypt
- Mail Sender: Nodemailer
- SMTP Provider: Gmail/Naver/AWS SES
- Verification Code Store: Redis (권장) 또는 MongoDB 임시 컬렉션
- Push: Firebase Cloud Messaging (FCM)
- File Storage: Local uploads (환경별 S3/Cloudinary 확장 가능)
- API Docs: Swagger/OpenAPI 또는 Postman Collection

### 1.5 최신 구현 반영
- 관리자만 기자재를 등록/수정/삭제할 수 있다.
- 기자재 등록/수정 시 사진 파일을 함께 업로드할 수 있다.
- 기자재 등록 시 QR 코드와 QR 이미지 URL이 즉시 생성되어 DB에 저장된다.
- 기자재 목록은 카테고리, 상태, 검색어, 정렬 기준으로 필터링 가능하다.
- 연체 반납 시 벌금 저장 대신 `borrowBlockedUntil` 기준의 대여 금지 정책을 적용한다.
- 분실 신고는 기자재와 대여 상태를 `LOST`로, 파손 신고는 기자재 상태를 `REPAIR`로 자동 반영한다.

### 1.4 기본 정보
- Base URL (Dev): http://localhost:3000/api
- Base URL (Prod): https://api.inventory-system.com/api
- Response Format: JSON
- Auth Header: Authorization: Bearer <accessToken>

---

## 2. 인증 및 회원가입 플로우 (이메일 인증코드)

### 2.1 사용자 입력
앱에서 아래 정보를 입력한다.
- 아이디(로그인 ID): 이메일
- 이름
- 전화번호
- 비밀번호
- 인증받을 이메일

참고:
- 일반적으로 로그인 이메일과 인증 이메일은 동일하게 사용한다.
- 필요 시 `verificationEmail`을 별도 필드로 받을 수 있다.

### 2.2 인증코드 발송
1. 사용자가 인증번호 전송 버튼 클릭
2. 서버가 6자리 숫자 코드 생성 (예: 129482)
3. 서버가 SMTP로 이메일 발송
4. 서버는 코드 원문이 아니라 해시값을 저장
5. 코드 유효시간은 3~5분 (권장 5분)

### 2.3 코드 검증
1. 사용자가 수신한 코드를 앱에 입력
2. 서버가 저장된 해시와 입력 코드 비교
3. 성공 시 검증 완료 상태를 저장 (`verified=true`)
4. 검증 완료 토큰(`verificationToken`) 발급 가능

### 2.4 회원가입 완료
1. 서버는 해당 이메일의 검증 완료 여부 확인
2. 비밀번호를 bcrypt로 해시 후 저장
3. MongoDB users 컬렉션에 사용자 생성
4. 가입 완료 응답 반환

---

## 3. 라우터 구조 (백엔드 기준)

```text
/api
├── /auth
│   ├── POST /send-verification-code
│   ├── POST /verify-code
│   ├── POST /register
│   ├── POST /login
│   ├── POST /refresh
│   └── POST /logout
├── /equipment
│   ├── GET    /
│   ├── GET    /:id
│   ├── POST   /
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   └── POST   /:id/generate-qr
├── /categories
│   ├── GET    /
│   ├── POST   /
│   ├── PATCH  /:categoryId
│   └── DELETE /:categoryId
├── /loans
│   ├── POST   /scan
│   ├── POST   /:loanId/return
│   ├── POST   /:loanId/force-return
│   ├── POST   /:loanId/extension-requests
│   ├── PATCH  /:loanId/extension-requests/:requestId
│   ├── POST   /:loanId/report-loss
│   ├── POST   /:loanId/report-damage
│   ├── GET    /my-loans
│   ├── GET    /
│   ├── GET    /overdue
│   └── GET    /penalties
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
└── /users
    ├── GET    /
    ├── GET    /:id
    ├── PATCH  /:id/role
    ├── PATCH  /profile
    ├── PATCH  /password
    ├── GET    /notification-settings
    ├── PATCH  /notification-settings
    ├── GET    /push-tokens
    ├── POST   /push-tokens
    ├── DELETE /push-tokens
    └── POST   /push-test
└── /admin
    ├── GET    /notification-settings
    ├── PATCH  /notification-settings
    ├── PATCH  /penalties/:penaltyId
    └── POST   /notifications/broadcast
└── /files
    ├── POST   /upload
    ├── GET    /my
    └── GET    /all
```

공통 미들웨어 흐름:
```text
Request -> CORS -> JSON Parser -> Logger -> Auth Check -> Role Check -> Handler -> Error Handler
```

---

## 4. 권한별 API 분리

### 4.1 회원/공통 API
- POST /auth/send-verification-code
- POST /auth/verify-code
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- GET /equipment
- GET /equipment/:id
- GET /equipment?category=&status=&search=&sortBy=&sortOrder=&page=&limit=
- POST /rental-requests
- GET /rental-requests
- POST /loans/scan
- POST /loans/:loanId/return
- POST /loans/:loanId/extension-requests
- POST /loans/:loanId/report-loss
- POST /loans/:loanId/report-damage
- GET /loans/my-loans
- PATCH /users/profile
- PATCH /users/password
- GET /users/notification-settings
- PATCH /users/notification-settings
- GET /users/push-tokens
- POST /users/push-tokens
- DELETE /users/push-tokens
- POST /users/push-test
- POST /files/upload
- GET /files/my

### 4.2 관리자 API (ADMIN)
- POST /equipment (multipart/form-data, field: `photo` optional)
- PATCH /equipment/:id (multipart/form-data, field: `photo` optional)
- DELETE /equipment/:id
- POST /equipment/:id/generate-qr
- GET /categories
- POST /categories
- PATCH /categories/:categoryId
- DELETE /categories/:categoryId
- PATCH /rental-requests/:id/approve
- PATCH /rental-requests/:id/reject
- POST /loans/:loanId/force-return
- PATCH /loans/:loanId/extension-requests/:requestId
- GET /loans/:loanId/extension-requests
- PATCH /loans/:loanId/report-loss/:reportId
- PATCH /loans/:loanId/report-damage/:reportId
- GET /loans
- GET /loans/overdue
- GET /loans/penalties
- POST /repairs
- PATCH /repairs/:id/complete
- GET /repairs/equipment/:equipmentId
- GET /dashboard/equipment-stats
- GET /dashboard/rental-stats
- GET /dashboard/monthly-trends
- GET /admin/notification-settings
- PATCH /admin/notification-settings
- PATCH /admin/penalties/:penaltyId
- POST /admin/notifications/broadcast
- GET /files/all
- GET /users
- GET /users/:id
- PATCH /users/:id/role

---

## 5. 인증 API 상세

### 5.1 인증코드 발송
POST /auth/send-verification-code

요청 본문:
```json
{
  "email": "student01@example.com"
}
```

응답 (200):
```json
{
  "success": true,
  "message": "Verification code sent",
  "data": {
    "expiresInSeconds": 300
  }
}
```

서버 동작:
- 6자리 숫자 코드 생성
- Nodemailer + SMTP로 메일 발송
- Redis 키 예시: `email:verify:student01@example.com`
- 값은 코드 해시 저장, TTL 300초

### 5.2 인증코드 검증
POST /auth/verify-code

요청 본문:
```json
{
  "email": "student01@example.com",
  "code": "129482"
}
```

응답 (200):
```json
{
  "success": true,
  "message": "Email verified",
  "data": {
    "verificationToken": "verify_eyJ...",
    "verified": true
  }
}
```

### 5.3 회원가입 완료
POST /auth/register

요청 본문:
```json
{
  "email": "student01@example.com",
  "name": "홍길동",
  "phone": "01012345678",
  "password": "Password!123",
  "verificationEmail": "student01@example.com",
  "verificationToken": "verify_eyJ..."
}
```

응답 (201):
```json
{
  "success": true,
  "message": "Registered successfully",
  "data": {
    "id": "664f7c0d2e7f9f0012ab3456",
    "email": "student01@example.com",
    "name": "홍길동",
    "role": "STUDENT"
  }
}
```

### 5.4 로그인
POST /auth/login

요청 본문:
```json
{
  "email": "student01@example.com",
  "password": "Password!123"
}
```

응답 (200):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "664f7c0d2e7f9f0012ab3456",
      "email": "student01@example.com",
      "name": "홍길동",
      "role": "STUDENT"
    }
  }
}
```

### 5.5 토큰 갱신
POST /auth/refresh

### 5.6 로그아웃
POST /auth/logout

---

## 5.7 일반 사용자 기능 매핑 (첨부 FR 기준)

| 기능 | API |
|------|-----|
| 기자재 조회 | GET /equipment, GET /equipment/:id |
| QR 코드 스캔 | POST /loans/scan |
| 대여 신청 | POST /rental-requests |
| 대여 이력 조회 | GET /loans/my-loans |
| 반납 처리 | POST /loans/scan (두 번째 스캔), POST /loans/:loanId/return (예외) |
| 대여 연장 신청 | POST /loans/:loanId/extension-requests |
| 고장/파손 신고 | POST /loans/:loanId/report-damage |
| 분실 신고 | POST /loans/:loanId/report-loss |
| 알림 수신 설정 | GET /users/notification-settings, PATCH /users/notification-settings |
| 푸시 토큰 관리 | GET /users/push-tokens, POST /users/push-tokens, DELETE /users/push-tokens |
| 푸시 테스트 | POST /users/push-test |
| 파일 업로드/조회 | POST /files/upload, GET /files/my |

---

## 5.8 관리자 기능 매핑 (첨부 FR 기준)

| 기능 | API |
|------|-----|
| 기자재 관리 | POST /equipment, PATCH /equipment/:id, DELETE /equipment/:id |
| 카테고리 관리 | GET /categories, POST /categories, PATCH /categories/:categoryId, DELETE /categories/:categoryId |
| 연장 요청 처리 | GET /loans/:loanId/extension-requests, PATCH /loans/:loanId/extension-requests/:requestId |
| 강제 반납 | POST /loans/:loanId/force-return |
| 연체/페널티 관리 | GET /loans/overdue, GET /loans/penalties, PATCH /admin/penalties/:penaltyId |
| 알림 설정 | GET /admin/notification-settings, PATCH /admin/notification-settings |
| 관리자 브로드캐스트 | POST /admin/notifications/broadcast |
| 고장 신고 처리 | PATCH /loans/:loanId/report-damage/:reportId, PATCH /loans/:loanId/report-loss/:reportId |
| 관리자 대시보드 | GET /dashboard/equipment-stats, GET /dashboard/rental-stats, GET /dashboard/monthly-trends |
| 파일 전체 조회 | GET /files/all |

---

## 6. QR 대여/반납 처리 규칙

### 6.1 영구 QR 코드 정책
- 기자재마다 QR 코드 1개를 고정으로 발급한다.
- QR 코드는 기자재 식별자 역할만 수행한다.
- QR 이미지 URL(`qrUrl`)을 Equipment 컬렉션에 저장한다.
- 대여/반납 판별은 서버 상태 기반으로 수행한다.

### 6.2 QR 스캔 API
POST /loans/scan

요청:
```json
{
  "qrCode": "QR001 또는 QR URL",
  "notes": "수업 프로젝트"
}
```

판별 규칙:
- 해당 기자재가 AVAILABLE이고 사용자 ACTIVE 대여가 없으면 BORROW
- 같은 사용자가 같은 기자재 ACTIVE 대여 중이면 RETURN (두 번째 스캔 반납)
- 다른 사용자가 대여 중이면 `이미 다른 사용자가 대여중인 물품입니다` 오류 반환
- 사용자가 연체 패널티 기간(`borrowBlockedUntil`)이면 BORROW 불가
- 연체 반납 시 연체 일수(`overdueDays`)만큼 대여 제한 패널티 부여
- 완화 기준: 연체 일수는 `24시간 단위 내림(floor)`으로 계산

응답 예시:
```json
{
  "success": true,
  "data": {
    "action": "BORROW",
    "loanId": "6650ab1f2e7f9f0012ab4001",
    "status": "ACTIVE"
  }
}
```

반납 응답 예시 (두 번째 스캔):
```json
{
  "success": true,
  "data": {
    "action": "RETURN",
    "loanId": "6650ab1f2e7f9f0012ab4001",
    "status": "RETURNED",
    "returnedAt": "2026-04-13T11:30:00.000Z",
    "penalty": {
      "type": "LATE_RETURN_BLOCK",
      "blockedUntil": "2026-04-15T11:30:00.000Z",
      "overdueDays": 2
    }
  }
}
```

대여 차단 응답 예시 (연체 패널티 중):
```json
{
  "success": false,
  "error": "BORROW_BLOCKED",
  "message": "Late return penalty active until 2026-04-15T11:30:00.000Z"
}
```

### 6.3 대여 연장 처리

연장 신청 생성:
- POST /loans/:loanId/extension-requests

요청:
```json
{
  "requestedDueDate": "2026-04-20T18:00:00.000Z",
  "reason": "프로젝트 일정 연기"
}
```

응답 (201):
```json
{
  "success": true,
  "message": "Extension request created",
  "data": {
    "requestId": "ext_001",
    "loanId": "6650ab1f2e7f9f0012ab4001",
    "status": "PENDING"
  }
}
```

관리자 승인/거절:
- PATCH /loans/:loanId/extension-requests/:requestId

요청:
```json
{
  "status": "APPROVED",
  "reviewNote": "1회 연장 승인"
}
```

응답 (200):
```json
{
  "success": true,
  "message": "Extension request processed",
  "data": {
    "requestId": "ext_001",
    "loanId": "6650ab1f2e7f9f0012ab4001",
    "status": "APPROVED",
    "updatedDueDate": "2026-04-20T18:00:00.000Z"
  }
}
```

### 6.4 분실/파손 신고 처리

분실 신고:
- POST /loans/:loanId/report-loss

요청:
```json
{
  "description": "강의실 이동 중 분실",
  "reportedAt": "2026-04-13T09:00:00.000Z"
}
```

파손 신고:
- POST /loans/:loanId/report-damage

요청:
```json
{
  "description": "카메라 렌즈 균열 발생",
  "severity": "MEDIUM",
  "reportedAt": "2026-04-13T09:30:00.000Z"
}
```

공통 응답 (201):
```json
{
  "success": true,
  "message": "Report submitted",
  "data": {
    "reportId": "rep_001",
    "loanId": "6650ab1f2e7f9f0012ab4001",
    "reportType": "LOSS",
    "status": "REPORTED"
  }
}
```

관리자 처리:
- PATCH /loans/:loanId/report-loss/:reportId
- PATCH /loans/:loanId/report-damage/:reportId

강제 반납 처리:
- POST /loans/:loanId/force-return

요청:
```json
{
  "reason": "반납 기한 초과 2일",
  "adminNote": "관리자 강제 반납 처리"
}
```

응답 (200):
```json
{
  "success": true,
  "message": "Force return processed",
  "data": {
    "loanId": "6650ab1f2e7f9f0012ab4001",
    "status": "RETURNED",
    "returnedAt": "2026-04-13T12:00:00.000Z"
  }
}
```

요청:
```json
{
  "status": "CONFIRMED",
  "action": "MOVE_TO_REPAIR",
  "adminNote": "점검 후 수리 접수"
}
```

---

## 7. MongoDB 스키마 (Mongoose)

### 7.1 User
```javascript
const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  passwordHash: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['STUDENT', 'ADMIN'], default: 'STUDENT' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### 7.2 EmailVerification (Redis 권장)
Redis 사용 시:
- Key: `email:verify:{email}`
- Value: `{ codeHash, attempts, verified }`
- TTL: 300초

MongoDB 대안(임시 컬렉션) 시:
```javascript
const emailVerificationSchema = new Schema({
  email: { type: String, required: true, index: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
});
```

### 7.3 Equipment / Loan
- Equipment: `name`, `category`, `serialNumber`, `qrCode`, `status`
- Loan: `userId`, `equipmentId`, `borrowedAt`, `dueDate`, `returnedAt`, `status`

Equipment 상세 필드:
- `qrCode`: 스캔 판별용 영구 식별값
- `qrUrl`: QR 이미지 URL (DB 저장)
- `photoUrl`: 기자재 사진 URL
- `photoStoredName`: 저장된 사진 파일명
- `categoryName`: 목록 필터/정렬용 카테고리 표시명

User 상세 필드:
- `borrowBlockedUntil`: 연체 일수만큼 대여 금지되는 종료 시각

### 7.4 ExtensionRequest / IncidentReport
- ExtensionRequest: `loanId`, `requestedDueDate`, `reason`, `status`, `reviewNote`, `reviewedBy`
- IncidentReport: `loanId`, `reportType(LOSS|DAMAGE)`, `description`, `severity`, `status`, `adminNote`
- LOSS 신고 시: 기자재 상태 `LOST`, 대여 상태 `LOST`
- DAMAGE 신고 시: 기자재 상태 `REPAIR`

### 7.5 Category / Penalty / AdminNotificationSetting
- Category: `name`, `description`, `isActive`, `displayOrder`
- Penalty: `userId`, `loanId`, `reason`, `amount`, `status(PENDING|WAIVED|PAID)`, `reviewedBy`
- AdminNotificationSetting: `overdueAlertEnabled`, `incidentAlertEnabled`, `digestTime`

---

## 8. 자동 알림 (반납 하루 전)

### 8.1 스케줄
- 실행 시간: 매일 오전 10시
- 대상: `dueDate - now <= 24h` 이고 `status=ACTIVE`

### 8.2 채널
- 1순위: FCM 푸시
- 대체: 이메일

### 8.2.1 연체 대여 금지
- 연체 반납 시 `borrowBlockedUntil` 값을 설정한다.
- `borrowBlockedUntil`이 미래인 사용자는 `/loans/scan`과 `/loans/:loanId/return` 흐름에서 대여/반납 정책에 따라 차단된다.

### 8.3 중복 방지
- 동일 loanId 기준 하루 1회만 발송

### 8.4 알림 수신 설정 API

사용자 알림 설정 조회:
- GET /users/notification-settings

응답 (200):
```json
{
  "success": true,
  "data": {
    "pushEnabled": true,
    "emailEnabled": true,
    "dueReminderEnabled": true,
    "dueReminderHoursBefore": 24
  }
}
```

### 8.5 FCM 디바이스 토큰 API
- GET /users/push-tokens
- POST /users/push-tokens
- DELETE /users/push-tokens

등록 요청 예시:
```json
{
  "token": "FCM_DEVICE_TOKEN",
  "platform": "ANDROID"
}
```

### 8.6 푸시 발송 테스트 API
- 사용자 셀프 테스트: POST /users/push-test
- 관리자 브로드캐스트: POST /admin/notifications/broadcast

### 8.7 파일 스토리지 API
- 업로드: POST /files/upload (multipart/form-data, field: `file`)
- 내 파일 조회: GET /files/my
- 전체 파일 조회(관리자): GET /files/all

기자재 등록용 사진 업로드:
- POST /equipment (multipart/form-data, field: `photo`)
- PATCH /equipment/:id (multipart/form-data, field: `photo`)

업로드 응답 예시:
```json
{
  "success": true,
  "message": "File uploaded",
  "data": {
    "fileId": "6650ab1f2e7f9f0012ab4999",
    "originalName": "damage.jpg",
    "mimeType": "image/jpeg",
    "size": 182736,
    "url": "http://localhost:3000/uploads/1713000000000-123456789-damage.jpg",
    "purpose": "INCIDENT_EVIDENCE"
  }
}
```

사용자 알림 설정 변경:
- PATCH /users/notification-settings

요청:
```json
{
  "pushEnabled": true,
  "emailEnabled": false,
  "dueReminderEnabled": true,
  "dueReminderHoursBefore": 24
}
```

응답 (200):
```json
{
  "success": true,
  "message": "Notification settings updated",
  "data": {
    "pushEnabled": true,
    "emailEnabled": false,
    "dueReminderEnabled": true,
    "dueReminderHoursBefore": 24
  }
}
```

관리자 알림 설정 조회:
- GET /admin/notification-settings

관리자 알림 설정 변경:
- PATCH /admin/notification-settings

요청:
```json
{
  "overdueAlertEnabled": true,
  "incidentAlertEnabled": true,
  "digestTime": "09:00"
}
```

응답 (200):
```json
{
  "success": true,
  "message": "Admin notification settings updated",
  "data": {
    "overdueAlertEnabled": true,
    "incidentAlertEnabled": true,
    "digestTime": "09:00"
  }
}
```

---

## 9. 오류 코드

| Code | HTTP | 설명 |
|------|------|------|
| VERIFICATION_CODE_EXPIRED | 400 | 인증코드 만료 |
| VERIFICATION_CODE_INVALID | 400 | 인증코드 불일치 |
| VERIFICATION_REQUIRED | 400 | 이메일 인증 미완료 |
| EMAIL_ALREADY_EXISTS | 409 | 이미 가입된 이메일 |
| LOGIN_FAILED | 401 | 이메일/비밀번호 불일치 |
| TOKEN_EXPIRED | 401 | 토큰 만료 |
| UNAUTHORIZED | 403 | 권한 없음 |
| EQUIPMENT_NOT_AVAILABLE | 409 | 기자재 대여 불가 |
| BORROW_BLOCKED | 403 | 연체 반납 패널티로 대여 불가 |
| EXTENSION_NOT_ALLOWED | 400 | 연장 신청 불가 상태 |
| EXTENSION_ALREADY_PENDING | 409 | 처리 대기 중 연장 신청 존재 |
| INCIDENT_REPORT_NOT_FOUND | 404 | 분실/파손 신고 내역 없음 |
| INCIDENT_REPORT_ALREADY_RESOLVED | 409 | 이미 처리 완료된 신고 |
| CATEGORY_IN_USE | 409 | 카테고리 사용 중으로 삭제 불가 |
| FORCE_RETURN_NOT_ALLOWED | 400 | 강제 반납 불가 상태 |
| PENALTY_NOT_FOUND | 404 | 페널티 내역 없음 |
| VALIDATION_ERROR | 422 | 입력값 검증 실패 |

---

## 10. 환경 변수 (.env)

```env
NODE_ENV=development
PORT=3000
APP_BASE_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/inventory_db?retryWrites=true&w=majority

# JWT
JWT_SECRET=your_jwt_secret
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# SMTP (메일 발송)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_mail@gmail.com
SMTP_PASS=your_app_password
MAIL_FROM=no-reply@inventory-system.com

# Redis (인증코드 저장)
REDIS_URL=redis://localhost:6379
VERIFICATION_CODE_TTL_SECONDS=300
VERIFICATION_CODE_LENGTH=6
VERIFICATION_MAX_ATTEMPTS=5

# File Storage
UPLOAD_DIR=uploads
UPLOAD_MAX_FILE_SIZE_MB=10

# Notification
FCM_SERVER_KEY=your_fcm_server_key

# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 11. 배포 권장 구성

- Backend: Railway
- DB: MongoDB Atlas
- Redis: Upstash Redis 또는 Railway Redis
- CI/CD: GitHub Actions

배포 체크:
1. Railway에 앱 연결
2. Atlas/Redis 환경 변수 등록
3. SMTP 계정 앱 비밀번호 등록
4. /api/health 헬스체크 확인
5. main push 자동 배포 확인

---

## 11.1 Postman 문서화

- Collection: `backend/postman/smart-inventory.postman_collection.json`
- Environment: `backend/postman/smart-inventory.local.postman_environment.json`

---

## 12. 보안 기준

- 비밀번호는 bcrypt 해시 저장
- 인증코드는 해시 저장 (원문 저장 금지)
- 인증 시도 횟수 제한 (브루트포스 방지)
- 이메일 발송 API rate limit 적용
- HTTPS 필수

---

문서 버전: 2.0 (Email Verification + MongoDB)
마지막 수정일: 2026-04-13
작성: 백엔드 팀
