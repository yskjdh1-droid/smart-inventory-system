# 미국 주식 데이터 분석 및 시각화 웹앱 - 최종 보고서

**제출자:** 컴퓨터공학과 4학년 안효진  
**GitHub:** https://github.com/gomsaygom/stock-app  
**보고서 파일:** REPORT.md

---

## 1. 실험의 목적과 범위

### 목적

개인 투자자가 별도의 금융 플랫폼 없이도 미국 주식의 종목 검색, 주가 흐름 확인, 기술적 지표 분석을 한 화면에서 수행할 수 있는 웹 기반 주식 차트 시각화 서비스를 개발한다.

### 포함 내용

- 미국 주식 실시간 시세 조회 (Yahoo Finance API)
- 캔들차트 시각화 (1분봉 ~ 3년봉, 총 9가지 기간)
- 기술적 지표: 이동평균선(MA5/20/60), 볼린저 밴드, RSI(14), MACD(12,26,9), 거래량
- 자동 지지선/저항선 계산 및 표시
- 종목 검색: 티커 코드, 영문 회사명, 한글 회사명 지원
- 관심종목 목록 관리 (추가/삭제/클릭 전환)
- 종목 상세 정보 카드 (시가/고가/저가/거래량/52주 고저/시가총액/P·E)
- 반응형 레이아웃 및 사이드바 토글
- 4개 차트 패널 드래그 동기화

### 불포함 내용

- 한국 주식 시장 (KRX/KOSPI) 데이터
- 실제 매매 기능 (주문/체결)
- 사용자 로그인 및 계정 관리
- 포트폴리오 수익률 계산
- 실시간 WebSocket 스트리밍 (주기적 폴링 방식 사용)

---

## 2. 분석

### 유스케이스 목록

| 번호 | 유스케이스 | 액터 | 설명 |
|------|-----------|------|------|
| UC-01 | 종목 검색 | 사용자 | 회사명(한글/영문) 또는 티커 코드로 종목 검색 |
| UC-02 | 차트 조회 | 사용자 | 선택 종목의 캔들차트를 기간별로 조회 |
| UC-03 | 기간 선택 | 사용자 | 1분/5분/30분/1시간/1개월/3개월/6개월/1년/3년 선택 |
| UC-04 | 이동평균선 조회 | 사용자 | MA5/MA20/MA60 오버레이 표시 |
| UC-05 | 볼린저 밴드 표시 | 사용자 | BB 버튼으로 볼린저 밴드 ON/OFF |
| UC-06 | RSI 조회 | 사용자 | RSI(14) 보조지표 패널 확인 |
| UC-07 | MACD 조회 | 사용자 | MACD(12,26,9) 보조지표 패널 확인 |
| UC-08 | 거래량 조회 | 사용자 | 거래량 히스토그램 패널 확인 |
| UC-09 | 지지/저항선 표시 | 사용자 | S/R 버튼으로 자동 지지선/저항선 ON/OFF |
| UC-10 | 관심종목 추가 | 사용자 | ☆ 버튼으로 현재 종목을 관심목록에 추가 |
| UC-11 | 관심종목 삭제 | 사용자 | 사이드바에서 ✕ 버튼으로 종목 삭제 |
| UC-12 | 관심종목 전환 | 사용자 | 사이드바 종목 클릭으로 즉시 차트 전환 |
| UC-13 | 종목 상세 정보 확인 | 사용자 | 시가/고가/저가/거래량/52주 고저/시가총액/P·E 확인 |

### 유스케이스 명세서 (주요 2개)

#### UC-01: 종목 검색

| 항목 | 내용 |
|------|------|
| 유스케이스명 | 종목 검색 |
| 액터 | 사용자 |
| 사전조건 | 앱이 실행 중이고 Flask 서버가 가동 중이어야 함 |
| 기본 흐름 | 1. 사용자가 검색창에 종목명 또는 코드 입력 → 2. 한글이면 내부 KO_MAP 테이블에서 티커 변환 → 3. 영문이면 Yahoo Finance Search API 호출 → 4. 드롭다운에 결과 표시 → 5. 사용자가 결과 선택 → 6. 해당 종목 차트 및 상세 정보 로드 |
| 예외 흐름 | 존재하지 않는 종목 입력 시 에러 메시지 표시 및 차트 초기화 |
| 사후조건 | 선택한 종목의 차트와 상세 정보가 화면에 표시됨 |

#### UC-05: 볼린저 밴드 표시

| 항목 | 내용 |
|------|------|
| 유스케이스명 | 볼린저 밴드 표시 |
| 액터 | 사용자 |
| 사전조건 | 차트에 데이터가 20개 이상 로드되어 있어야 함 |
| 기본 흐름 | 1. 사용자가 BB 버튼 클릭 → 2. 20일 이동평균 및 표준편차 계산 → 3. 상단 밴드(+2σ), 중간 밴드(MA20), 하단 밴드(-2σ) 차트에 표시 |
| 예외 흐름 | 데이터가 20개 미만이면 밴드 미표시 |
| 사후조건 | 캔들차트 위에 볼린저 밴드 3선이 오버레이로 표시됨 |

---

## 3. 설계

### 클래스 다이어그램 (주요 모듈)

```
┌─────────────────────────┐
│        App.jsx          │
│  (React 메인 컴포넌트)   │
├─────────────────────────┤
│ - symbol: string        │
│ - period: string        │
│ - quote: object         │
│ - watchlist: string[]   │
│ - showBB: boolean       │
│ - showSR: boolean       │
│ - sidebarOpen: boolean  │
├─────────────────────────┤
│ + handleSearch()        │
│ + addToWatchlist()      │
│ + removeFromWatchlist() │
│ + calcMA(data, period)  │
│ + calcRSI(data)         │
│ + calcMACD(data)        │
│ + calcBB(data)          │
│ + calcSupportResistance │
└────────────┬────────────┘
             │ HTTP 요청 (fetch API)
┌────────────▼────────────┐
│       app.py            │
│   (Flask 백엔드 서버)    │
├─────────────────────────┤
│ + GET /api/quote/:sym   │
│ + GET /api/chart/:sym   │
│ + GET /api/search?q=    │
└────────────┬────────────┘
             │ yfinance 라이브러리
┌────────────▼────────────┐
│    Yahoo Finance API    │
│  (외부 오픈 데이터)      │
└─────────────────────────┘
```

### 순서 다이어그램 - 종목 검색 및 차트 로드

```
사용자        App.jsx          Flask 서버       Yahoo Finance
  │               │                │                 │
  │──검색 입력──▶│                │                 │
  │               │──GET /search──▶│                 │
  │               │                │──yf.Search()──▶│
  │               │                │◀──검색결과──────│
  │               │◀──JSON 반환───│                 │
  │               │──드롭다운 표시│                 │
  │──종목 선택──▶│                │                 │
  │               │──GET /quote───▶│                 │
  │               │                │──yf.Ticker()──▶│
  │               │                │◀──시세 데이터───│
  │               │◀──JSON 반환───│                 │
  │               │──GET /chart───▶│                 │
  │               │                │──ticker.hist()▶│
  │               │                │◀──OHLCV 데이터──│
  │               │◀──JSON 반환───│                 │
  │               │──차트 렌더링  │                 │
  │◀──화면 표시──│                │                 │
```

### 순서도 - 지지선/저항선 자동 계산

```
시작
  │
  ▼
lookback = max(3, 데이터길이 / 10)
  │
  ▼
데이터 길이 >= lookback*2+1 ?
  │ No → 빈 결과 반환
  │ Yes
  ▼
각 캔들 i에 대해 반복:
  ├─ slice = i-lookback ~ i+lookback
  ├─ slice 내 모든 저가 >= data[i].low → 지지점 추가
  └─ slice 내 모든 고가 <= data[i].high → 저항점 추가
  │
  ▼
1.5% 이내 가격대 병합 (클러스터링)
  │
  ▼
최근 4개 지지선, 4개 저항선 선택
  │
  ▼
차트에 수평선으로 표시
  │
  ▼
끝
```

### 슈도코드 - RSI 계산

```
function calcRSI(data, period=14):
    if data.length < period+1: return []

    gains = 0, losses = 0
    for i in 1..period:
        diff = data[i].close - data[i-1].close
        if diff >= 0: gains += diff
        else: losses -= diff

    avgGain = gains / period
    avgLoss = losses / period

    result = []
    for i in period..data.length:
        diff = data[i].close - data[i-1].close
        avgGain = (avgGain*(period-1) + max(diff,0)) / period
        avgLoss = (avgLoss*(period-1) + max(-diff,0)) / period

        RS = avgGain / avgLoss
        RSI = 100 - (100 / (1 + RS))
        result.append({ time: data[i].time, value: RSI })

    return result
```

---

## 4. 구현

### 개발 환경

| 항목 | 내용 |
|------|------|
| OS | Windows 11 |
| 에디터 | Visual Studio Code |
| 버전 관리 | Git + GitHub Desktop |
| 브라우저 | Chrome |

### 기술 스택

| 구분 | 기술 | 버전 | 역할 |
|------|------|------|------|
| Frontend | React | 18.x | UI 컴포넌트 |
| Frontend | Vite | 5.x | 빌드 도구 |
| Frontend | Lightweight Charts | 4.x | 캔들/보조지표 차트 |
| Backend | Python | 3.14 | 서버 언어 |
| Backend | Flask | 3.x | REST API 서버 |
| Backend | Flask-CORS | 4.x | 크로스 오리진 허용 |
| Data | yfinance | 1.x | Yahoo Finance 데이터 수집 |

### 서버/클라이언트 구조

```
[브라우저 - React App]
    localhost:5173
         │
         │ HTTP (fetch API)
         │
[Flask 서버]
    localhost:5000
         │
         │ yfinance 라이브러리
         │
[Yahoo Finance 서버]
    (외부 오픈 API)
```

### 주요 API 엔드포인트

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/quote/:symbol` | 현재가·시가·고저·시총·P/E 조회 |
| GET | `/api/chart/:symbol?period=` | 기간별 OHLCV 캔들 데이터 (MACD용 60일 버퍼 포함) |
| GET | `/api/search?q=` | 종목 검색 (회사명/코드) |

### 주요 구현 내용

#### 주차별 개발 내역

| 주차 | 구현 내용 |
|------|----------|
| 1주차 | 개발 환경 세팅, React+Vite 프로젝트 생성, Flask 서버 구축, Yahoo Finance API 연동, 캔들차트 기본 시각화 |
| 2주차 | 종목 검색 기능, 기간 선택 버튼(1분~3년), 이동평균선 MA5/20/60, 관심종목 사이드바, GitHub 커밋 |
| 3주차 | 거래량/RSI/MACD 보조지표 패널 분리, 종목 상세 정보 카드, 차트 드래그 동기화, MACD 60일 버퍼 처리 |
| 4주차 | 반응형 레이아웃, 사이드바 토글, 볼린저 밴드(BB), 지지/저항선 자동 계산(S/R), 한글/영문 회사명 검색, 버그 수정 |

#### MACD 60일 버퍼 처리
MACD 계산은 최소 26개 데이터가 필요하다. 1개월 봉(약 20일)의 경우 데이터가 부족하므로 서버에서 실제 표시 기간보다 60일 더 가져온 뒤, `display` 필드로 표시 범위를 제어한다.

```python
# server/app.py
days = period_map.get(period, 30)
start = end - timedelta(days=days + 60)   # 60일 버퍼 추가
display_start = end - timedelta(days=days)

for date, row in hist.iterrows():
    data.append({
        ...
        'display': date.date() >= display_start.date()  # 표시 여부 제어
    })
```

#### 볼린저 밴드 계산 (프론트엔드)

```javascript
function calcBB(data, period=20, multiplier=2) {
  return data.map((item, idx) => {
    if (idx < period - 1) return null
    const slice = data.slice(idx - period + 1, idx + 1)
    const avg = slice.reduce((s, d) => s + d.close, 0) / period
    const std = Math.sqrt(
      slice.reduce((s, d) => s + Math.pow(d.close - avg, 2), 0) / period
    )
    return {
      time: item.time,
      upper: avg + multiplier * std,   // 상단 밴드 (+2σ)
      middle: avg,                      // 중간 밴드 (MA20)
      lower: avg - multiplier * std,   // 하단 밴드 (-2σ)
    }
  }).filter(Boolean)
}
```

#### 한글 종목 검색 (프론트엔드)

```javascript
const KO_MAP = {
  '애플': 'AAPL', '테슬라': 'TSLA', '엔비디아': 'NVDA', ...
}

const handleSearch = () => {
  const raw = input.trim()
  const sym = KO_MAP[raw] || raw.toUpperCase()
  setSymbol(sym)
}
```

---

## 5. 실험 (테스트)

### 테스트 케이스

| ID | 테스트 항목 | 입력 | 기대 결과 | 실제 결과 | 통과 |
|----|------------|------|-----------|-----------|------|
| T-01 | 티커 코드 검색 | AAPL | Apple 차트 표시 | 차트 정상 표시 | ✅ |
| T-02 | 영문 회사명 검색 | Apple | 드롭다운에 AAPL 표시 | 정상 표시 | ✅ |
| T-03 | 한글 검색 | 애플 | AAPL 차트 표시 | 차트 정상 표시 | ✅ |
| T-04 | 한글 검색 | 넷플릭스 | NFLX 차트 표시 | 차트 정상 표시 | ✅ |
| T-05 | 존재하지 않는 종목 | ASDFGH | 에러 메시지 + 차트 초기화 | 정상 동작 | ✅ |
| T-06 | 기간 전환 | 1분 → 1년 | 차트 데이터 변경 | 정상 전환 | ✅ |
| T-07 | 볼린저 밴드 ON | BB 버튼 클릭 | 상/중/하 3개 밴드 표시 | 정상 표시 | ✅ |
| T-08 | 볼린저 밴드 OFF | BB 버튼 재클릭 | 밴드 제거 | 정상 제거 | ✅ |
| T-09 | 지지/저항선 ON | S/R 버튼 클릭 | 수평선 자동 표시 | 정상 표시 | ✅ |
| T-10 | 1개월 봉 MACD | AAPL 1개월 | MACD 정상 표시 | 60일 버퍼로 정상 계산 | ✅ |
| T-11 | RSI 과매수 확인 | NVDA 3개월 | RSI > 70 구간 확인 | 정상 표시 | ✅ |
| T-12 | 관심종목 추가 | ☆ 버튼 클릭 | 사이드바에 종목 추가 | 정상 추가 | ✅ |
| T-13 | 관심종목 삭제 | ✕ 버튼 클릭 | 사이드바에서 종목 제거 | 정상 제거 | ✅ |
| T-14 | 반응형 레이아웃 | 창 크기 축소 | 차트 크기 자동 조정 | 정상 조정 | ✅ |
| T-15 | 차트 동기화 드래그 | 메인 차트 드래그 | 거래량/RSI/MACD 동시 이동 | 정상 동기화 | ✅ |

### 테스트 결과 요약

- 총 테스트 케이스: 15개
- 통과: 15개 / 실패: 0개
- 통과율: 100%

---

## 6. 결론

### 작업 결과

본 프로젝트에서는 개인 투자자를 위한 미국 주식 데이터 시각화 웹 애플리케이션을 성공적으로 개발하였다.

**주요 성과:**

1. **풀스택 구현**: React(프론트엔드)와 Python Flask(백엔드)를 연동하여 클라이언트-서버 구조의 웹 애플리케이션을 완성하였다.

2. **다양한 차트 지원**: Lightweight Charts 라이브러리를 활용하여 1분봉부터 3년봉까지 9가지 기간의 캔들차트를 구현하였으며, 거래량/RSI/MACD 3개의 독립 패널을 차트와 동기화하였다.

3. **기술적 지표 구현**: 이동평균선(MA5/20/60), 볼린저 밴드, RSI(14), MACD(12,26,9), 지지선/저항선 자동 계산 등 주요 기술적 지표를 모두 프론트엔드에서 직접 계산하여 서버 부하를 최소화하였다. MACD의 경우 최소 26개 데이터가 필요하므로 서버에서 60일 버퍼 데이터를 추가로 수집하여 해결하였다.

4. **사용성 개선**: 한글 종목명 검색(KO_MAP), 영문 회사명 자동완성, 반응형 레이아웃, 사이드바 토글 등 사용자 편의 기능을 구현하였다.

5. **무료 API 활용**: Yahoo Finance(yfinance)를 활용하여 API 키 없이 무료로 실시간에 가까운 주가 데이터를 수집하였다.

**한계점 및 향후 개선 사항:**

- 한글 검색은 KO_MAP에 사전 등록된 종목만 지원하므로 전체 종목 검색 불가
- Yahoo Finance 정책 변경에 따른 데이터 수집 불안정 가능성
- 향후 포트폴리오 관리, 종목 비교, Vercel 배포 기능 추가 예정

**GitHub 저장소:** https://github.com/gomsaygom/stock-app
