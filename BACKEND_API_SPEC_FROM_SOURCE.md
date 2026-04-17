# 스마트 기자재 대여 시스템 백엔드 API 명세서 (소스 기준 재작성)

이 문서는 backend 소스 코드만 읽어서 작성한 명세서입니다.

- 기준 경로: backend/src
- 기준 파일: app.js, routes/*.routes.js, middlewares/auth.js, middlewares/errorHandler.js, services/loan-scan.service.js, services/qr-code.service.js
- 제외: 루트의 기존 BACKEND_API_SPECIFICATION.md

## 1. 기본 정보

- Base URL: /api
- Health Check: GET /api/health
- 인증 방식: Authorization 헤더의 Bearer JWT
- 권한: requireRole(["ADMIN"])가 지정된 엔드포인트는 관리자만 호출 가능

### 1.1 공통 성공 응답

```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

### 1.2 공통 실패 응답

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "에러 메시지",
  "details": null
}
```

대표 에러 코드 예시:

- UNAUTHORIZED (401)
- FORBIDDEN (403)
- VALIDATION_ERROR (422)
- *_NOT_FOUND (404)
- *_DUPLICATED (409)

## 2. 완료 항목 반영

아래 항목은 요청하신 완료 목록 기준으로 반영했습니다.

- 완료: MongoDB Atlas 클라우드 세팅 완료
- 완료: 기자재 CRUD API 개발
- 완료: QR 코드 생성 API 개발
- 완료: 대여/반납 처리 API 개발
- 완료: JWT 인증 미들웨어 및 페널티(연체 대여 제한) 로직
- 완료: 공통 UI 컴포넌트 설계
- 완료: 기자재 목록 및 상세 화면 UI
- 완료: 이메일 인증 회원가입 구현

참고: 문서 대상은 백엔드 API이므로 UI 항목은 상태 반영만 포함하고 API 상세는 제외했습니다.

## 3. 인증/회원가입 API

Prefix: /api/auth

1. POST /send-verification-code
- 설명: 이메일 인증코드 발송
- Body: email

2. POST /verify-code
- 설명: 인증코드 검증
- Body: email, code

3. POST /register
- 설명: 인증 완료 사용자 회원가입
- Body: email, name, phone, password, verificationToken

4. POST /login
- 설명: 로그인
- Body: email, password

5. POST /refresh
- 설명: 토큰 재발급
- Body: refreshToken (또는 Authorization 헤더)

6. POST /logout
- 설명: 로그아웃 처리

## 4. 기자재(Equipment) CRUD + QR API

Prefix: /api/equipment

1. GET /
- 권한: 로그인
- 설명: 기자재 목록 조회 (필터/검색/정렬/페이지네이션)
- Query: category, status, search, sortBy, sortOrder, page, limit

2. GET /:id
- 권한: 로그인
- 설명: 기자재 상세 조회

3. POST /
- 권한: ADMIN
- 설명: 기자재 생성
- Content-Type: multipart/form-data
- Body: name, categoryId, model, serialNumber, description, location, quantity, photo(file)
- 동작: 생성 시 qrCode 자동 생성, qrUrl 저장

4. PATCH /:id
- 권한: ADMIN
- 설명: 기자재 수정
- Content-Type: multipart/form-data
- Body: 수정 필드 + photo(file)

5. PATCH /:id/availability
- 권한: ADMIN
- 설명: 대여 가능 여부 전환
- Body: rentable(boolean)
- 제약: ACTIVE 대여가 있으면 unavailable 전환 불가

6. DELETE /:id
- 권한: ADMIN
- 설명: 소프트 삭제 (deletedAt 세팅)

7. POST /:id/generate-qr
- 권한: ADMIN
- 설명: QR 재생성/재조회
- 응답: equipmentId, qrCode, qrUrl, qrImage(data URL)

### 4.1 QR 생성/파싱 로직 요약

- 영구 코드 생성: EQ- + 12자리 SHA256 해시
- QR 이미지 URL: 외부 QR 이미지 생성 URL 조합
- 스캔 시 extractQrCode 동작:
  - 일반 문자열이면 그대로 사용
  - URL이면 data 또는 code 쿼리 파라미터를 추출해서 코드로 사용

## 5. 카테고리 CRUD API

Prefix: /api/categories

1. GET /
- 권한: 로그인
- 설명: 카테고리 목록 조회

2. POST /
- 권한: ADMIN
- 설명: 카테고리 생성
- Body: name, description, displayOrder

3. PATCH /:categoryId
- 권한: ADMIN
- 설명: 카테고리 수정

4. DELETE /:categoryId
- 권한: ADMIN
- 설명: 카테고리 삭제
- 제약: 해당 카테고리를 사용하는 기자재가 있으면 삭제 불가

## 6. 대여/반납(Loan) 핵심 API

Prefix: /api/loans

1. POST /scan
- 권한: 로그인
- 설명: QR 스캔으로 대여 또는 반납 처리
- Body: qrCode, notes, dueDate, rentalDays
- 결과:
  - 이미 본인 ACTIVE 대여가 있으면 RETURN 처리
  - 아니면 BORROW 처리

2. POST /:loanId/return
- 권한: 로그인(본인 또는 ADMIN)
- 설명: 수동 반납 처리

3. POST /:loanId/force-return
- 권한: ADMIN
- 설명: 강제 반납

### 6.1 연체 페널티(대여 제한) 로직

- 반납 시 dueDate 초과면 연체 일수 계산
- 사용자 borrowBlockedUntil = 현재시각 + 연체일수(일)
- borrowBlockedUntil이 현재보다 미래면 신규 대여 차단(BORROW_BLOCKED)

4. POST /:loanId/extension-requests
- 권한: 로그인(본인)
- 설명: 연장 요청 생성
- Body: requestedDueDate, reason
- 제약: 최대 7일 연장, ACTIVE 대여만 가능, 중복 PENDING 불가

5. GET /:loanId/extension-requests
- 권한: ADMIN
- 설명: 해당 대여의 연장 요청 목록

6. PATCH /:loanId/extension-requests/:requestId
- 권한: ADMIN
- 설명: 연장 요청 승인/거절 처리
- Body: status, reviewNote

7. POST /:loanId/report-loss
- 권한: 로그인(본인 또는 ADMIN)
- 설명: 분실 신고
- 결과: loan.status=LOST, equipment.status=LOST

8. POST /:loanId/report-damage
- 권한: 로그인(본인 또는 ADMIN)
- 설명: 파손 신고
- Body: description, damagedPart, severity
- 결과: equipment.status=REPAIR

9. PATCH /:loanId/report-loss/:reportId
- 권한: ADMIN
- 설명: 분실 신고 처리 상태 업데이트

10. PATCH /:loanId/report-damage/:reportId
- 권한: ADMIN
- 설명: 파손 신고 처리 상태 업데이트

11. GET /incident-reports
- 권한: ADMIN
- 설명: 사고 신고 목록 조회 (필터/페이지네이션)

12. GET /my-loans
- 권한: 로그인
- 설명: 내 대여 목록 조회

13. GET /overdue
- 권한: ADMIN
- 설명: 연체 대여 목록 조회

14. GET /penalties
- 권한: ADMIN
- 설명: 패널티 목록 조회

15. GET /
- 권한: ADMIN
- 설명: 전체 대여 목록 조회 (status, userId, equipmentId 필터)

## 7. 대여 요청 API

Prefix: /api/rental-requests

1. POST /
- 권한: 로그인
- 설명: 대여 요청 생성
- Body: equipmentId, dueDate, reason

2. GET /
- 권한: 로그인
- 설명: 대여 요청 목록 조회
- 동작: ADMIN은 전체, 일반 사용자는 본인 요청만

3. PATCH /:id/approve
- 권한: ADMIN
- 설명: 대여 요청 승인

4. PATCH /:id/reject
- 권한: ADMIN
- 설명: 대여 요청 반려
- Body: rejectionReason

## 8. 수리(Repairs) API

Prefix: /api/repairs

1. POST /
- 권한: ADMIN
- 설명: 수리 접수
- Body: equipmentId, issue, cost, notes

2. PATCH /:id/complete
- 권한: ADMIN
- 설명: 수리 완료 처리 (기자재 상태 AVAILABLE 복귀)

3. GET /equipment/:equipmentId
- 권한: ADMIN
- 설명: 특정 기자재 수리 이력 조회

참고: 현재 수리 이력은 메모리 배열(repairRecords) 기반으로 동작합니다.

## 9. 대시보드 API

Prefix: /api/dashboard (모두 ADMIN)

1. GET /equipment-stats
- 설명: 기자재 상태 통계

2. GET /rental-stats
- 설명: 대여 통계

3. GET /monthly-trends
- 설명: 월별 추이 통계
- Query: months (기본 6)

## 10. 사용자 API

Prefix: /api/users

1. GET / (ADMIN)
- 설명: 사용자 목록

2. GET /:id (ADMIN)
- 설명: 사용자 상세

3. PATCH /:id/role (ADMIN)
- 설명: 역할 변경
- Body: role(STUDENT|ADMIN)

4. PATCH /profile (로그인)
- 설명: 내 프로필 수정

5. PATCH /password (로그인)
- 설명: 비밀번호 변경
- Body: currentPassword, newPassword

6. GET /notification-settings (로그인)
- 설명: 내 알림 설정 조회

7. PATCH /notification-settings (로그인)
- 설명: 내 알림 설정 수정
- Body: pushEnabled, emailEnabled, dueReminderEnabled

8. GET /push-tokens (로그인)
- 설명: 내 푸시 토큰 목록

9. POST /push-tokens (로그인)
- 설명: 푸시 토큰 등록
- Body: token, platform

10. DELETE /push-tokens (로그인)
- 설명: 푸시 토큰 비활성화
- Body: token

11. POST /push-test (로그인)
- 설명: 내 계정 푸시 테스트 발송

## 11. 관리자 API

Prefix: /api/admin (모두 ADMIN)

1. GET /notification-settings
- 설명: 관리자 알림 설정 조회

2. PATCH /notification-settings
- 설명: 관리자 알림 설정 수정

3. PATCH /penalties/:penaltyId
- 설명: 패널티 상태 업데이트

4. POST /notifications/broadcast
- 설명: 다중 사용자 푸시 브로드캐스트
- Body: title, body, userIds[]

5. POST /notifications/due-reminders/run
- 설명: 반납 예정 알림 스윕 수동 실행

## 12. 파일 업로드 API

Prefix: /api/files

1. POST /upload
- 권한: 로그인
- 설명: 파일 업로드
- Content-Type: multipart/form-data
- Field: file
- Body: purpose(optional)

2. GET /my
- 권한: 로그인
- 설명: 내 업로드 파일 목록

3. GET /all
- 권한: ADMIN
- 설명: 전체 업로드 파일 목록

## 13. 인증 미들웨어 요약

- requireAuth
  - Bearer 토큰 검증 실패 시 401 UNAUTHORIZED
  - 성공 시 req.user = { id, role, email }
- requireRole
  - role 미충족 시 403 FORBIDDEN

## 14. 구현 체크리스트 (요청 범위)

- 기자재 CRUD: 구현됨
- QR 생성/재생성 API: 구현됨
- QR 스캔 기반 대여/반납: 구현됨
- 이메일 인증 회원가입: 구현됨
- JWT 인증/권한 체크: 구현됨
- 연체 패널티(대여 제한): 구현됨

## 15. Postman 요청/응답 예시

아래 예시는 Postman 기준으로 바로 테스트할 수 있는 형태입니다.

### 15.1 환경 변수 (Postman Environment)

- baseUrl = http://localhost:3000/api
- accessToken = (로그인 후 발급값)
- refreshToken = (로그인 후 발급값)
- equipmentId = (기자재 ID)
- loanId = (대여 ID)
- categoryId = (카테고리 ID)

### 15.2 이메일 인증코드 발송

Request

```http
POST {{baseUrl}}/auth/send-verification-code
Content-Type: application/json

{
  "email": "student01@example.com"
}
```

Response (200)

```json
{
  "success": true,
  "message": "Verification code sent",
  "data": {
    "email": "student01@example.com",
    "expiresInSeconds": 300
  }
}
```

### 15.3 로그인

Request

```http
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "Admin1234!"
}
```

Response (200)

```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "accessToken": "<JWT_ACCESS_TOKEN>",
    "refreshToken": "<JWT_REFRESH_TOKEN>",
    "user": {
      "id": "665000000000000000000001",
      "email": "admin@example.com",
      "name": "관리자",
      "role": "ADMIN"
    }
  }
}
```

### 15.4 기자재 생성 (ADMIN, multipart)

Request

```http
POST {{baseUrl}}/equipment
Authorization: Bearer {{accessToken}}
Content-Type: multipart/form-data

form-data:
- name: Sony A7M4
- categoryId: {{categoryId}}
- model: ILCE-7M4
- serialNumber: SN-A7M4-0001
- description: 영상 촬영용 카메라
- location: 공학관 301
- quantity: 1
- photo: (file)
```

Response (201)

```json
{
  "success": true,
  "message": "Equipment created",
  "data": {
    "equipment": {
      "_id": "665000000000000000000111",
      "name": "Sony A7M4",
      "serialNumber": "SN-A7M4-0001",
      "status": "AVAILABLE",
      "qrCode": "EQ-ABCDEF123456",
      "qrUrl": "https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=EQ-ABCDEF123456"
    }
  }
}
```

### 15.5 기자재 목록 조회

Request

```http
GET {{baseUrl}}/equipment?status=AVAILABLE&search=sony&page=1&limit=10
Authorization: Bearer {{accessToken}}
```

Response (200)

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "equipment": [
      {
        "_id": "665000000000000000000111",
        "name": "Sony A7M4",
        "status": "AVAILABLE",
        "serialNumber": "SN-A7M4-0001"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

### 15.6 QR 재생성 (ADMIN)

Request

```http
POST {{baseUrl}}/equipment/{{equipmentId}}/generate-qr
Authorization: Bearer {{accessToken}}
```

Response (200)

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "equipmentId": "665000000000000000000111",
    "qrCode": "EQ-ABCDEF123456",
    "qrUrl": "https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=EQ-ABCDEF123456",
    "qrImage": "data:image/png;base64,iVBORw0KGgoAAA..."
  }
}
```

### 15.7 QR 스캔 대여 처리

Request

```http
POST {{baseUrl}}/loans/scan
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "qrCode": "EQ-ABCDEF123456",
  "notes": "수업 촬영",
  "rentalDays": 3
}
```

Response (201, BORROW)

```json
{
  "success": true,
  "message": "Scan processed",
  "data": {
    "action": "BORROW",
    "loanId": "665000000000000000000222",
    "equipmentId": "665000000000000000000111",
    "status": "ACTIVE",
    "dueDate": "2026-04-20T10:00:00.000Z"
  }
}
```

Response (200, RETURN)

```json
{
  "success": true,
  "message": "Scan processed",
  "data": {
    "action": "RETURN",
    "loanId": "665000000000000000000222",
    "equipmentId": "665000000000000000000111",
    "status": "RETURNED",
    "returnedAt": "2026-04-18T10:00:00.000Z",
    "borrowBlock": null
  }
}
```

### 15.8 수동 반납 처리

Request

```http
POST {{baseUrl}}/loans/{{loanId}}/return
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "notes": "정상 반납"
}
```

Response (200)

```json
{
  "success": true,
  "message": "Returned",
  "data": {
    "loanId": "665000000000000000000222",
    "status": "RETURNED",
    "returnedAt": "2026-04-18T11:30:00.000Z",
    "borrowBlock": {
      "blockedUntil": "2026-04-20T11:30:00.000Z",
      "overdueDays": 2
    }
  }
}
```

### 15.9 카테고리 생성 (ADMIN)

Request

```http
POST {{baseUrl}}/categories
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "name": "카메라",
  "description": "촬영 장비",
  "displayOrder": 1
}
```

Response (201)

```json
{
  "success": true,
  "message": "Category created",
  "data": {
    "category": {
      "_id": "665000000000000000000333",
      "name": "카메라",
      "description": "촬영 장비",
      "displayOrder": 1,
      "isActive": true
    }
  }
}
```

### 15.10 에러 응답 예시

Request (토큰 없음)

```http
GET {{baseUrl}}/equipment
```

Response (401)

```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Unauthorized",
  "details": null
}
```

Request (검증 실패)

```http
POST {{baseUrl}}/loans/scan
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "qrCode": ""
}
```

Response (422)

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "qrCode is required",
  "details": null
}
```

---

최종 작성 기준일: 2026-04-17
작성 근거: backend 소스 코드 직접 판독