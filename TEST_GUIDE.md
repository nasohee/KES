# KES 프로젝트 테스트 가이드

## 목차
1. [전체 테스트 순서](#1-전체-테스트-순서)
2. [Step 1: 환경 구동](#step-1-환경-구동)
3. [Step 2: AI 파이프라인 테스트](#step-2-ai-파이프라인-테스트)
4. [Step 3: 백엔드 API 테스트](#step-3-백엔드-api-테스트)
5. [Step 4: DB 직접 확인](#step-4-db-직접-확인)
6. [트러블슈팅](#트러블슈팅)

---

## 1. 전체 테스트 순서

```
① Docker로 MySQL + AI 파이프라인 실행
   → AI가 모델 학습 후 결과를 MySQL에 적재
      ↓
② Spring Boot 백엔드 실행
   → MySQL 데이터를 REST API로 제공
      ↓
③ API 호출 테스트 (curl / 브라우저 / Postman)
   → 6개 엔드포인트 동작 확인
```

---

## Step 1: 환경 구동

### 1-1. Docker로 MySQL + AI 실행

```bash
# 프로젝트 루트에서 실행
cd c:\Users\ptw06\projects\KES

# MySQL + AI 파이프라인 빌드 & 실행
docker-compose up --build
```

**정상 출력 예시:**
```
kes-mysql  | [Note] mysqld: ready for connections.
kes-ai     | ============================================================
kes-ai     | KES Battery SOH Prediction Pipeline
kes-ai     | ============================================================
kes-ai     |
kes-ai     | [Step 1] 데이터 로드...
kes-ai     |   metadata: 7567행 로드
kes-ai     |   BMS 데이터: 4002행 로드
kes-ai     |
kes-ai     | [Step 2] 전처리 + SOH 산출...
kes-ai     |   전처리 완료: 270행 (discharge cycles)
kes-ai     |   배터리 요약:
kes-ai     |     B0045: 초기 1.856Ah → 현재 1.435Ah (SOH 77.3%, warning)
kes-ai     |     B0047: 초기 1.674Ah → 현재 1.156Ah (SOH 69.1%, critical)
kes-ai     |     B0048: 초기 1.744Ah → 현재 1.392Ah (SOH 79.8%, warning)
kes-ai     |
kes-ai     | [Step 3] 피처 엔지니어링...
kes-ai     |   피처 추출 완료: 260행, 24컬럼
kes-ai     |
kes-ai     | [Step 4] XGBoost 모델 학습...
kes-ai     | [Train] 배터리: ['B0045', 'B0047', 'B0048']
kes-ai     | [Train] 피처 수: 15
kes-ai     |   Fold (test=B0045): RMSE=0.0xxx, MAE=0.0xxx, R²=0.9xxx
kes-ai     |   Fold (test=B0047): RMSE=0.0xxx, MAE=0.0xxx, R²=0.9xxx
kes-ai     |   Fold (test=B0048): RMSE=0.0xxx, MAE=0.0xxx, R²=0.9xxx
kes-ai     |
kes-ai     | [피처 중요도]
kes-ai     |   1. capacity_prev: 0.xxxx
kes-ai     |   2. rolling_mean_3: 0.xxxx
kes-ai     |   ...
kes-ai     |
kes-ai     | [Step 6] MySQL 적재...
kes-ai     | [DB] battery 테이블 적재: 3건
kes-ai     | [DB] battery_measurement 테이블 적재: 270건
kes-ai     | [DB] ai_prediction 테이블 적재: 260건
kes-ai     | [DB] ai_model 테이블 적재: XGBoost
kes-ai     | [DB] bms_data 테이블 적재: 4002건
kes-ai     |
kes-ai     | Pipeline 완료!
```

> **확인 포인트:**
> - `Pipeline 완료!` 가 출력되면 AI 성공
> - `battery 테이블 적재: 3건` 등 DB 적재 로그 확인
> - AI 컨테이너는 1회 실행 후 종료됨 (정상)

### 1-2. Spring Boot 백엔드 실행

**새 터미널을 열고:**
```bash
cd c:\Users\ptw06\projects\KES\backend

# Gradle로 빌드 & 실행
.\gradlew bootRun
```

**정상 출력:**
```
Started KesApplication in 2.xxx seconds
Tomcat started on port 8080
```

> 백엔드는 `localhost:3306`의 MySQL에 연결합니다.
> Docker MySQL이 먼저 실행되어 있어야 합니다.

---

## Step 2: AI 파이프라인 테스트

### AI만 로컬에서 별도 테스트하기 (DB 없이)

```bash
cd c:\Users\ptw06\projects\KES\ai

# 가상환경 생성 & 활성화
python -m venv venv
.\venv\Scripts\activate

# 패키지 설치
pip install -r requirements.txt

# 데이터 디렉토리 준비
mkdir -p data\raw
copy ..\cleaned_dataset\metadata.csv data\raw\
xcopy ..\cleaned_dataset\data data\raw\data\ /E /I
copy ..\PSIM_BMS_Simulation_Data.csv data\raw\

# 파이프라인 실행
python run_pipeline.py
```

**예상 결과:**
- Step 1~5 정상 완료
- Step 6 (DB 적재)은 `[WARNING] DB 적재 실패` 출력 → **정상** (MySQL 없으니까)
- `models/xgboost_soh.pkl` 파일 생성 확인

### AI 결과 검증 체크리스트

| 항목 | 확인 방법 | 기대값 |
|---|---|---|
| 전처리 행 수 | Step 2 로그 | ~270행 |
| 피처 수 | Step 3 로그 | 15개 피처 |
| LOBO 3-fold | Step 4 로그 | 3개 fold 결과 출력 |
| R² score | CV 평균 로그 | 0.9 이상이면 좋음 |
| 모델 저장 | `models/xgboost_soh.pkl` 존재 | 파일 존재 |
| 예측 결과 | Step 5 로그 | ~260건, 평균 오차 < 0.1 Ah |

---

## Step 3: 백엔드 API 테스트

> **전제 조건:** Docker MySQL 실행 중 + AI 파이프라인 완료 + Spring Boot 실행 중

### API 목록

| # | 메서드 | URL | 설명 |
|---|---|---|---|
| 1 | GET | `/api/batteries` | 전체 배터리 목록 |
| 2 | GET | `/api/batteries/{id}` | 배터리 상세 정보 |
| 3 | GET | `/api/batteries/{id}/measurements` | Cycle별 실측 데이터 |
| 4 | GET | `/api/batteries/{id}/degradation` | 열화 예측 (실제 vs AI) |
| 5 | GET | `/api/bms/data` | BMS 시뮬레이션 전체 데이터 |
| 6 | GET | `/api/bms/status` | BMS 최신 상태 |

---

### 테스트 1: 전체 배터리 목록

**요청:**
```bash
curl http://localhost:8080/api/batteries
```

**예상 응답:**
```json
{
  "batteries": [
    {
      "batteryId": "B0045",
      "initialCapacity": 1.856,
      "currentCapacity": 1.435,
      "currentSoh": 77.3,
      "status": "warning"
    },
    {
      "batteryId": "B0047",
      "initialCapacity": 1.674,
      "currentCapacity": 1.156,
      "currentSoh": 69.1,
      "status": "critical"
    },
    {
      "batteryId": "B0048",
      "initialCapacity": 1.744,
      "currentCapacity": 1.392,
      "currentSoh": 79.8,
      "status": "warning"
    }
  ]
}
```

**확인 포인트:**
- ✅ 3개 배터리가 반환되는가?
- ✅ SOH 값이 0~100 범위인가?
- ✅ status가 normal/warning/critical 중 하나인가?

---

### 테스트 2: 배터리 상세 정보

**요청:**
```bash
curl http://localhost:8080/api/batteries/B0047
```

**예상 응답:**
```json
{
  "batteryId": "B0047",
  "initialCapacity": 1.674,
  "currentCapacity": 1.156,
  "currentSoh": 69.1,
  "status": "critical"
}
```

**에러 테스트 (존재하지 않는 ID):**
```bash
curl http://localhost:8080/api/batteries/B9999
```

**예상 응답:**
```json
{
  "status": 404,
  "message": "배터리를 찾을 수 없습니다: B9999"
}
```

---

### 테스트 3: Cycle별 실측 데이터

**요청:**
```bash
curl http://localhost:8080/api/batteries/B0045/measurements
```

**예상 응답 (일부):**
```json
{
  "batteryId": "B0045",
  "measurements": [
    {
      "cycle": 0,
      "capacity": 1.856,
      "re": 0.055,
      "rct": 0.019,
      "soh": 100.0,
      "ambientTemp": 4.0,
      "measuredAt": "2010-07-21T15:00:35"
    },
    {
      "cycle": 1,
      "capacity": 1.832,
      "re": 0.056,
      "rct": 0.020,
      "soh": 98.7,
      "ambientTemp": 4.0,
      "measuredAt": "2010-07-22T10:15:22"
    }
  ]
}
```

**확인 포인트:**
- ✅ cycle이 0부터 순차 증가하는가?
- ✅ capacity가 시간이 지남에 따라 감소하는가?
- ✅ soh가 100%에서 점점 떨어지는가?
- ✅ re, rct 값이 존재하는가?

---

### 테스트 4: 열화 예측 결과 (핵심!)

**요청:**
```bash
curl http://localhost:8080/api/batteries/B0047/degradation
```

**예상 응답 (일부):**
```json
{
  "batteryId": "B0047",
  "degradation": [
    {
      "cycle": 1,
      "actualCapacity": 1.661,
      "predictedCapacity": 1.658,
      "actualSoh": 99.2,
      "predictedSoh": 99.0,
      "modelName": "XGBoost"
    },
    {
      "cycle": 2,
      "actualCapacity": 1.643,
      "predictedCapacity": 1.640,
      "actualSoh": 98.1,
      "predictedSoh": 97.9,
      "modelName": "XGBoost"
    },
    {
      "cycle": 80,
      "actualCapacity": 1.156,
      "predictedCapacity": 1.162,
      "actualSoh": 69.1,
      "predictedSoh": 69.4,
      "modelName": "XGBoost"
    }
  ]
}
```

**확인 포인트:**
- ✅ actualCapacity와 predictedCapacity가 비슷한가? (차이 < 0.1 Ah)
- ✅ actualSoh와 predictedSoh가 비슷한가? (차이 < 5%)
- ✅ modelName이 "XGBoost"인가?
- ✅ cycle이 진행될수록 capacity가 감소하는가?

> 이 API가 **"정보 넣으면 잔존수명을 예측"** 하는 핵심 결과입니다.
> 프론트엔드에서 이 데이터로 실제 vs 예측 그래프를 그릴 수 있습니다.

---

### 테스트 5: BMS 시뮬레이션 데이터

**요청:**
```bash
curl http://localhost:8080/api/bms/data
```

**예상 응답 (일부):**
```json
{
  "data": [
    {
      "time": 0.0,
      "voltage": 4.19,
      "current": 0.0,
      "bmsSignal": 1,
      "status": "normal",
      "alertMsg": null
    },
    {
      "time": 3500.0,
      "voltage": 2.85,
      "current": -1.2,
      "bmsSignal": 0,
      "status": "warning",
      "alertMsg": "저전압 경고: 전압이 3.0V 미만입니다"
    }
  ]
}
```

**확인 포인트:**
- ✅ 약 4000개 데이터가 반환되는가?
- ✅ voltage < 3.0V인 행에 `status: "warning"` 이 있는가?
- ✅ bmsSignal이 0인 구간에 경고가 있는가?

---

### 테스트 6: BMS 현재 상태

**요청:**
```bash
curl http://localhost:8080/api/bms/status
```

**예상 응답:**
```json
{
  "status": "warning",
  "voltage": 2.65,
  "current": 0.0,
  "bmsSignal": 0,
  "alert": true,
  "message": "BMS 차단 상태"
}
```

또는 정상인 경우:
```json
{
  "status": "normal",
  "voltage": 3.85,
  "current": -1.0,
  "bmsSignal": 1,
  "alert": false,
  "message": "정상 상태입니다."
}
```

---

## Step 4: DB 직접 확인

### MySQL 접속

```bash
# Docker 컨테이너 안의 MySQL 접속
docker exec -it kes-mysql mysql -u kes -pkes1234 kes
```

### 확인 쿼리

```sql
-- 1. 배터리 목록
SELECT * FROM battery;

-- 2. 실측 데이터 (B0045 처음 5개 cycle)
SELECT battery_id, cycle, capacity, soh, re, rct
FROM battery_measurement
WHERE battery_id = 'B0045'
ORDER BY cycle ASC
LIMIT 5;

-- 3. AI 예측 결과 (B0047 처음 5개)
SELECT battery_id, cycle, actual_capacity, predicted_capacity,
       actual_soh, predicted_soh, prediction_error, split_type
FROM ai_prediction
WHERE battery_id = 'B0047'
ORDER BY cycle ASC
LIMIT 5;

-- 4. 모델 성능
SELECT * FROM ai_model;

-- 5. BMS 경고 데이터
SELECT * FROM bms_data
WHERE status = 'warning'
LIMIT 10;

-- 6. 테이블별 행 수 확인
SELECT 'battery' AS tbl, COUNT(*) AS cnt FROM battery
UNION ALL SELECT 'battery_measurement', COUNT(*) FROM battery_measurement
UNION ALL SELECT 'ai_prediction', COUNT(*) FROM ai_prediction
UNION ALL SELECT 'ai_model', COUNT(*) FROM ai_model
UNION ALL SELECT 'bms_data', COUNT(*) FROM bms_data;
```

**예상 결과 (테이블별 행 수):**

| 테이블 | 행 수 |
|---|---|
| battery | 3 |
| battery_measurement | ~270 |
| ai_prediction | ~260 |
| ai_model | 1 |
| bms_data | ~4000 |

---

## 브라우저에서 바로 테스트

백엔드가 GET 요청만 사용하므로 브라우저 주소창에 직접 입력해서 테스트할 수 있습니다:

| URL | 설명 |
|---|---|
| http://localhost:8080/api/batteries | 배터리 목록 |
| http://localhost:8080/api/batteries/B0045 | B0045 상세 |
| http://localhost:8080/api/batteries/B0047 | B0047 상세 |
| http://localhost:8080/api/batteries/B0048 | B0048 상세 |
| http://localhost:8080/api/batteries/B0045/measurements | B0045 실측 |
| http://localhost:8080/api/batteries/B0047/degradation | B0047 열화 예측 |
| http://localhost:8080/api/bms/data | BMS 전체 데이터 |
| http://localhost:8080/api/bms/status | BMS 상태 |

---

## 트러블슈팅

### ❌ Docker 관련

| 증상 | 원인 | 해결 |
|---|---|---|
| `port 3306 is already in use` | 로컬 MySQL이 이미 실행 중 | 로컬 MySQL 중지 or `docker-compose.yml`에서 포트 변경 (`"3307:3306"`) |
| `kes-ai exited with code 1` | 데이터 파일 경로 오류 | `cleaned_dataset/metadata.csv`, `cleaned_dataset/data/` 존재 확인 |
| `MYSQL_ROOT_PASSWORD must be set` | `.env` 파일 없음 | 프로젝트 루트에 `.env` 파일 확인 (`DB_PASSWORD=kes1234`, `MYSQL_ROOT_PASSWORD=root1234`) |

### ❌ 백엔드 관련

| 증상 | 원인 | 해결 |
|---|---|---|
| `Connection refused: localhost:3306` | MySQL 미실행 | `docker-compose up db` 먼저 실행 |
| `Table 'kes.battery' doesn't exist` | AI 파이프라인 미실행 | `docker-compose up ai` 실행하여 데이터 적재 |
| `빌드 실패` | JDK 미설치 | JDK 17+ 설치 필요 |

### ❌ AI 관련

| 증상 | 원인 | 해결 |
|---|---|---|
| `ModuleNotFoundError: No module named 'xgboost'` | 패키지 미설치 | `pip install -r requirements.txt` |
| `metadata.csv를 찾을 수 없습니다` | 경로 오류 | `ai/data/raw/metadata.csv` 존재 확인 |
| `[WARNING] DB 적재 실패` | MySQL 미연결 | DB 없이 테스트 시 정상 동작 (모델 학습은 완료됨) |
