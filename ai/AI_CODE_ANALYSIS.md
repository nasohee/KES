# KES AI 파이프라인 코드 분석서

## 목차
1. [전체 아키텍처](#1-전체-아키텍처)
2. [파일별 상세 분석](#2-파일별-상세-분석)
3. [데이터 흐름](#3-데이터-흐름)
4. [DB 스키마](#4-db-스키마)
5. [주요 알고리즘 설명](#5-주요-알고리즘-설명)
6. [실행 환경](#6-실행-환경)

---

## 1. 전체 아키텍처

```
ai/
├── run_pipeline.py          ← 진입점 (오케스트레이터)
├── Dockerfile               ← Docker 이미지 정의
├── requirements.txt         ← Python 패키지 목록
├── data/
│   ├── raw/                 ← 원본 데이터 (볼륨 마운트)
│   └── processed/           ← 가공 데이터 (미사용, 예약)
├── models/
│   └── xgboost_soh.pkl      ← 학습된 모델 저장 위치
└── src/
    ├── __init__.py
    ├── data_loader.py       ← Step 1: 데이터 로드
    ├── preprocessor.py      ← Step 2: 전처리 + SOH 산출
    ├── feature_extractor.py ← Step 3: 피처 엔지니어링
    ├── train.py             ← Step 4: XGBoost 모델 학습
    ├── predict.py           ← Step 5: 예측 결과 생성
    └── db_uploader.py       ← Step 6: MySQL 적재
```

### 파이프라인 실행 순서

```
run_pipeline.py (main)
    │
    ├─ Step 1: data_loader.load_metadata()         → metadata DataFrame
    ├─ Step 1: data_loader.load_bms_data()          → BMS DataFrame
    │
    ├─ Step 2: preprocessor.preprocess_data()       → 전처리된 discharge 데이터
    ├─ Step 2: preprocessor.get_battery_summary()   → 배터리 요약 정보
    │
    ├─ Step 3: feature_extractor.extract_features() → 피처가 추가된 학습 데이터
    │
    ├─ Step 4: train.train_model()                  → 모델 + 메타정보 + 예측결과
    │
    ├─ Step 5: predict.predict_soh()                → 최종 예측 결과 (actual vs predicted)
    │
    └─ Step 6: db_uploader.upload_*()               → MySQL 5개 테이블 적재
```

---

## 2. 파일별 상세 분석

---

### 2.1 `run_pipeline.py` — 진입점

**역할**: 전체 파이프라인을 순서대로 실행하는 오케스트레이터

**주요 로직**:
1. `sys.path`에 `src/` 디렉토리를 추가하여 모듈 import 가능하게 함
2. 데이터 경로를 `data/raw/` 기준으로 설정 (Docker 볼륨 마운트 위치)
3. Step 1~6을 순차 실행
4. DB 연결 실패 시에도 모델 학습/예측은 정상 완료 (try-except로 격리)

**사용된 함수**:
| 단계 | 호출 함수 | 모듈 |
|---|---|---|
| Step 1 | `load_metadata()`, `load_bms_data()` | data_loader |
| Step 2 | `preprocess_data()`, `get_battery_summary()` | preprocessor |
| Step 3 | `extract_features()` | feature_extractor |
| Step 4 | `train_model()` | train |
| Step 5 | `predict_soh()` | predict |
| Step 6 | `upload_battery_master()`, `upload_measurements()`, `upload_predictions()`, `upload_model_info()`, `upload_bms_data()` | db_uploader |

---

### 2.2 `data_loader.py` — 데이터 로드

**역할**: 3가지 데이터 소스를 읽어들이는 모듈

#### 함수 목록

| 함수 | 입력 | 출력 | 설명 |
|---|---|---|---|
| `load_metadata(path)` | CSV 경로 | DataFrame (7567행) | metadata.csv 로드 + 타입 정리 + start_time 파싱 |
| `_parse_start_time(time_str)` | 문자열 | pd.Timestamp | `[2010. 7. 21. 15. 0. 35.093]` → datetime 변환 |
| `load_discharge_csv(filepath)` | CSV 경로 | DataFrame | 개별 방전 CSV 로드 (Voltage, Current, Temp 등) |
| `load_bms_data(path)` | CSV 경로 | DataFrame (4002행) | BMS 시뮬레이션 데이터 로드 + 컬럼명 정규화 |
| `get_battery_ids(metadata)` | DataFrame | list | 배터리 ID 목록 반환 (`['B0045', 'B0047', 'B0048']`) |
| `get_data_dir(metadata_path)` | 문자열 | 문자열 | 개별 CSV가 있는 `data/` 디렉토리 경로 반환 |

#### `_parse_start_time` 상세 설명
metadata.csv의 `start_time` 컬럼은 numpy 배열 형태의 문자열입니다:
```
[2010.       7.      21.      15.       0.      35.093]
[2.0100e+03 7.0000e+00 2.1000e+01 ...]
```
이 함수는 정규식으로 숫자를 추출하여 `[년, 월, 일, 시, 분, 초]`로 파싱합니다.

#### BMS 컬럼명 정규화
```
Time (s)       → time_sec
Voltage_V1 (V) → voltage
Current_I1 (A) → current_val
BMS_Signal     → bms_signal
```

---

### 2.3 `preprocessor.py` — 전처리 + SOH 산출

**역할**: metadata에서 학습 가능한 형태로 변환 (FR-002)

#### 함수 목록

| 함수 | 설명 |
|---|---|
| `preprocess_data(metadata)` | 메인 전처리 함수. 아래 5단계를 순차 수행 |
| `_process_single_battery(battery_id, discharge_group, impedance_df)` | 배터리 1개의 전처리 |
| `get_initial_capacities(processed_df)` | 배터리별 최초 Capacity 딕셔너리 반환 |
| `get_battery_summary(processed_df)` | 배터리 마스터 테이블 적재용 요약 생성 |

#### `preprocess_data` 처리 흐름

```
metadata (7567행, 모든 타입)
    │
    ├─ ① type == 'discharge' 필터링
    │     → discharge 행만 추출
    │
    ├─ ② Capacity == 0 또는 NaN 제거
    │     → 이상치 제거 (간헐적으로 0이 기록된 행 존재)
    │
    ├─ ③ battery_id별 cycle 번호 매핑
    │     → test_id 순서로 정렬 후 0, 1, 2, ... 부여
    │
    ├─ ④ impedance Re, Rct 매칭
    │     → 각 discharge cycle에 가장 가까운 이전 impedance 측정값 매칭
    │     → forward-fill + backward-fill로 NaN 보간
    │
    └─ ⑤ SOH 산출
          → SOH = (현재 Capacity / 최초 Capacity) × 100%
```

#### Re, Rct 매칭 로직 상세
metadata에서 impedance 측정은 discharge와 별도 타이밍에 수행됩니다. 따라서 각 discharge cycle에 **직전에 측정된 impedance 값**을 매칭합니다:

```
test_id:  0(dis)  1(imp)  2(chg)  3(imp)  4(dis)  5(chg)  6(dis)
          ↓                        ↓       ↓               ↓
Re/Rct:   NaN     측정     -       측정    ← 3번의 값     ← 3번의 값
```

#### `get_battery_summary` — 상태 판단 기준
| SOH 범위 | 상태 |
|---|---|
| ≥ 80% | `normal` |
| 70% ~ 80% | `warning` |
| < 70% | `critical` |

---

### 2.4 `feature_extractor.py` — 피처 엔지니어링

**역할**: 모델 학습용 15개 피처를 자동 생성 (FR-002)

#### 메인 함수: `extract_features(processed_df, metadata_path)`

두 종류의 피처를 생성합니다:

**A. metadata 기반 피처** (`_add_metadata_features`):

| # | 피처명 | 계산 방법 | 의미 |
|---|---|---|---|
| 1 | `cycle` | 그대로 사용 | 사이클 번호 |
| 2 | `re` | impedance 매칭 | 전해질 저항 (Ω) |
| 3 | `rct` | impedance 매칭 | 전하전달 저항 (Ω) |
| 4 | `ambient_temp` | 그대로 사용 | 주변 온도 (°C) |
| 5 | `capacity_prev` | `capacity.shift(1)` | 이전 cycle의 Capacity |
| 6 | `capacity_diff` | `capacity.diff()` | Capacity 변화량 (열화 속도) |
| 7 | `rolling_mean_3` | `capacity.rolling(3).mean()` | 최근 3 cycle 이동평균 |
| 8 | `rolling_std_3` | `capacity.rolling(3).std()` | 최근 3 cycle 표준편차 (변동성) |
| 9 | `re_diff` | `re.diff()` | Re 변화량 |
| 10 | `rct_diff` | `rct.diff()` | Rct 변화량 |

**B. 방전 곡선 피처** (`_extract_curve_features`, `_compute_curve_features`):

| # | 피처명 | 계산 방법 | 의미 |
|---|---|---|---|
| 11 | `discharge_time` | `Time.max() - Time.min()` | 총 방전 시간 (초). 열화되면 짧아짐 |
| 12 | `avg_temperature` | `Temperature_measured.mean()` | 방전 중 평균 온도 |
| 13 | `max_temperature` | `Temperature_measured.max()` | 방전 중 최고 온도 |
| 14 | `voltage_drop_rate` | `np.polyfit(Time, Voltage, 1)[0]` | 전압 하강 기울기 (V/s). 1차 선형 회귀 |
| 15 | `energy` | `np.trapz(V×|I|, t) / 3600` | 적분 에너지 (Wh). 사다리꼴 적분법 |

#### 타겟 변수
- **`capacity`** (Ah): 방전 Capacity를 직접 예측
- 이후 `predict.py`에서 SOH = (predicted_capacity / initial_capacity) × 100으로 변환

---

### 2.5 `train.py` — XGBoost 모델 학습

**역할**: XGBoost 모델을 LOBO 교차검증으로 학습/평가하고 저장 (FR-003, FR-004)

#### 메인 함수: `train_model(features_df, model_save_dir)`

**반환값**: `(model, model_meta, all_predictions)` 튜플

#### 교차검증 전략: Leave-One-Battery-Out (LOBO)

배터리가 3개(B0045, B0047, B0048)이므로 3-fold 교차검증:

```
Fold 1: 학습(B0045, B0047) → 테스트(B0048)
Fold 2: 학습(B0045, B0048) → 테스트(B0047)
Fold 3: 학습(B0047, B0048) → 테스트(B0045)
```

> **왜 LOBO를 사용하는가?**
> 일반적인 random split은 같은 배터리의 데이터가 train과 test에 섞여
> 실제보다 성능이 과대평가됩니다. LOBO는 **한 번도 본 적 없는 배터리**에
> 대한 예측 성능을 측정하므로 실제 환경에 가까운 평가가 가능합니다.

#### XGBoost 하이퍼파라미터

```python
XGBRegressor(
    n_estimators=200,     # 트리 200개
    max_depth=5,          # 트리 최대 깊이 5
    learning_rate=0.05,   # 학습률 (보수적)
    subsample=0.8,        # 행 샘플링 80%
    colsample_bytree=0.8, # 컬럼 샘플링 80%
    random_state=42,      # 재현성
)
```

#### 학습 과정

```
1. LOBO 3-fold → 각 fold별 RMSE, MAE, R² 계산
2. CV 평균 메트릭 출력
3. 전체 데이터로 최종 모델 학습
4. 모델을 models/xgboost_soh.pkl로 저장 (joblib)
5. 피처 중요도 출력 (상위 10개)
6. CV 예측(test)과 전체 예측(train)을 병합하여 반환
```

#### 평가 지표
| 지표 | 설명 |
|---|---|
| RMSE | Root Mean Squared Error — 큰 오차에 민감 |
| MAE | Mean Absolute Error — 평균 절대 오차 |
| R² | 결정 계수 — 1에 가까울수록 좋음 |

---

### 2.6 `predict.py` — 예측 결과 생성

**역할**: 학습 결과를 최종 예측 결과 DataFrame으로 변환 (FR-003)

#### 메인 함수: `predict_soh(model, features_df, processed_df, model_name)`

#### 처리 흐름

```
train.py에서 받은 predicted_capacity
    │
    ├─ actual_soh   = (actual_capacity / initial_capacity) × 100
    ├─ predicted_soh = (predicted_capacity / initial_capacity) × 100
    ├─ prediction_error = |actual_capacity - predicted_capacity|
    └─ model_name = 'XGBoost'
```

#### 출력 컬럼
```
battery_id | cycle | actual_capacity | predicted_capacity |
actual_soh | predicted_soh | model_name | prediction_error | split_type
```

#### `load_model()` 함수
저장된 `.pkl` 모델을 로드하는 유틸리티. 추후 새 데이터 예측 시 사용.

---

### 2.7 `db_uploader.py` — MySQL 적재

**역할**: 파이프라인 결과를 MySQL 5개 테이블에 적재 (FR-005, SR-001)

#### 함수 목록

| 함수 | 적재 테이블 | 데이터 소스 |
|---|---|---|
| `upload_battery_master()` | `battery` | `get_battery_summary()` 결과 |
| `upload_measurements()` | `battery_measurement` | `preprocess_data()` 결과 |
| `upload_predictions()` | `ai_prediction` | `predict_soh()` 결과 |
| `upload_model_info()` | `ai_model` | `train_model()` 메타정보 |
| `upload_bms_data()` | `bms_data` | `load_bms_data()` + 이상 탐지 |

#### DB 연결

```python
# 환경변수에서 읽음 (Docker Compose에서 주입)
DB_HOST=db, DB_PORT=3306, DB_NAME=kes, DB_USER=kes, DB_PASSWORD=kes1234

# SQLAlchemy 연결 URL
mysql+pymysql://kes:kes1234@db:3306/kes
```

#### `wait_for_db()` — 연결 대기
Docker Compose에서 MySQL이 먼저 기동되길 기다리는 함수.
최대 30회, 2초 간격으로 재시도 (`SELECT 1` 쿼리로 확인).

#### BMS 이상 탐지 로직 (`upload_bms_data`)

| 조건 | status | alert_msg |
|---|---|---|
| Voltage < 3.0V | `warning` | "저전압 경고: 전압이 3.0V 미만입니다" |
| BMS Signal 변화 (0↔1) | `warning` | "BMS 신호 변경 감지" |
| BMS Signal = 0 (차단 상태) | `warning` | "BMS 차단 상태" |
| 그 외 | `normal` | NULL |

---

## 3. 데이터 흐름

```
[cleaned_dataset/metadata.csv]     [cleaned_dataset/data/*.csv]     [PSIM_BMS_Simulation_Data.csv]
        │ (7567행)                         │ (수백~수천행/파일)                │ (4002행)
        ▼                                 ▼                                 ▼
   data_loader.py                   data_loader.py                   data_loader.py
   load_metadata()                  load_discharge_csv()             load_bms_data()
        │                                 │                                 │
        ▼                                 │                                 │
   preprocessor.py                        │                                 │
   preprocess_data()                      │                                 │
   (discharge만 필터, ~270행)               │                                 │
        │                                 │                                 │
        ▼                                 ▼                                 │
   feature_extractor.py ─────────────────────                               │
   extract_features()                                                       │
   (15개 피처 추가, ~260행)                                                    │
        │                                                                   │
        ▼                                                                   │
   train.py                                                                 │
   train_model()                                                            │
   (LOBO 3-fold, 모델 저장)                                                   │
        │                                                                   │
        ▼                                                                   │
   predict.py                                                               │
   predict_soh()                                                            │
   (SOH 변환, 오차 계산)                                                       │
        │                                                                   │
        ▼                                                                   ▼
   db_uploader.py ◄─────────────────────────────────────────────────────────┘
   upload_*() → MySQL 5개 테이블
```

---

## 4. DB 스키마

### 테이블 관계도

```
┌─────────────┐      ┌─────────────────────┐      ┌──────────────────┐
│   battery   │◄────┤ battery_measurement │      │    ai_model      │
│─────────────│      │─────────────────────│      │──────────────────│
│ battery_id  │PK    │ battery_id          │FK    │ model_name       │
│ initial_cap │      │ cycle               │      │ rmse, mae, r2    │
│ current_cap │      │ capacity            │      │ trained_at       │
│ current_soh │      │ re, rct             │      └──────────────────┘
│ status      │      │ soh, ambient_temp   │
└─────────────┘      │ measured_at         │
       ▲              └─────────────────────┘
       │
       │              ┌─────────────────────┐      ┌──────────────────┐
       └─────────────┤   ai_prediction     │      │    bms_data      │
                      │─────────────────────│      │──────────────────│
                      │ battery_id          │FK    │ time_sec         │
                      │ cycle               │      │ voltage          │
                      │ actual_capacity     │      │ current_val      │
                      │ predicted_capacity  │      │ bms_signal       │
                      │ actual_soh          │      │ status           │
                      │ predicted_soh       │      │ alert_msg        │
                      │ model_name          │      └──────────────────┘
                      │ prediction_error    │
                      │ split_type          │
                      └─────────────────────┘
```

### 각 테이블 용도

| 테이블 | 용도 | 예상 행 수 |
|---|---|---|
| `battery` | 배터리 기본 정보 (목록 조회용) | 3행 |
| `battery_measurement` | Cycle별 실측 데이터 | ~270행 |
| `ai_prediction` | AI 예측 결과 (실측 vs 예측) | ~260행 |
| `ai_model` | 모델 성능 정보 | 1행 (XGBoost) |
| `bms_data` | BMS 시뮬레이션 데이터 + 이상 탐지 | ~4000행 |

---

## 5. 주요 알고리즘 설명

### 5.1 SOH (State of Health) 산출

```
SOH(%) = (현재 Capacity / 최초 Capacity) × 100

예시 (B0047):
  최초 Capacity: 1.674 Ah
  현재 Capacity: 1.156 Ah
  SOH = 1.156 / 1.674 × 100 = 69.1%  → 'critical' 상태
```

### 5.2 XGBoost (eXtreme Gradient Boosting)

XGBoost는 **결정 트리 앙상블** 모델입니다:

```
입력 피처 [cycle, Re, Rct, capacity_prev, discharge_time, ...]
    │
    ▼
 ┌──────┐   ┌──────┐   ┌──────┐        ┌──────┐
 │Tree 1│ + │Tree 2│ + │Tree 3│ + ... + │Tree N│  (N=200)
 └──────┘   └──────┘   └──────┘        └──────┘
    │           │           │               │
    └───────────┴───────────┴───────────────┘
                        │
                        ▼
               예측 Capacity (Ah)
                        │
                        ▼
                SOH 역산 (%)
```

- 각 트리는 이전 트리의 **잔차(오차)**를 학습
- 200개의 트리가 순차적으로 오차를 줄여나감
- `max_depth=5`: 각 트리의 최대 깊이 제한 (과적합 방지)
- `learning_rate=0.05`: 각 트리의 기여도를 낮게 설정 (안정적 학습)

### 5.3 방전 곡선 피처 추출

개별 CSV 파일의 방전 곡선에서 통계적 특성을 추출합니다:

```
전압 (V)
4.2 ┤╲
    │  ╲
    │   ╲──────╲          voltage_drop_rate = 기울기
    │           ╲
    │            ╲
2.7 ┤             ╲
    └──────────────────── 시간 (s)
    0        discharge_time

energy = 전압 × 전류의 적분 (사다리꼴 적분법)
       = ∫₀ᵗ V(t) × |I(t)| dt / 3600  [Wh]
```

### 5.4 BMS 이상 탐지

PSIM 시뮬레이션 데이터에서 규칙 기반 이상 탐지:

```
전압 (V)
4.0 ┤─────────────╲
    │              ╲
3.0 ┤ ─ ─ ─ ─ ─ ─ ─╲─ ─ ─ ─ ─  ← 저전압 경계
    │                ╲
    │                 ╲ ← 여기서부터 'warning'
    │                  ╲─────
    └──────────────────────── 시간 (s)
           BMS=1        BMS=0
                    ↑
              신호 변경 감지
```

---

## 6. 실행 환경

### Docker Compose 구성

```yaml
services:
  db:        # MySQL 8.4 (healthcheck 포함)
  ai:        # Python 3.11 (db 준비 후 실행)
```

### 볼륨 마운트 매핑

| 호스트 경로 | 컨테이너 경로 |
|---|---|
| `./cleaned_dataset/metadata.csv` | `/app/data/raw/metadata.csv` |
| `./cleaned_dataset/data/` | `/app/data/raw/data/` |
| `./PSIM_BMS_Simulation_Data.csv` | `/app/data/raw/PSIM_BMS_Simulation_Data.csv` |

### Python 패키지

| 패키지 | 용도 |
|---|---|
| `pandas` | 데이터프레임 처리 |
| `numpy` | 수치 연산, 적분 |
| `scikit-learn` | 평가 지표 (RMSE, MAE, R²) |
| `xgboost` | 머신러닝 모델 |
| `sqlalchemy` | DB 연결 (ORM) |
| `pymysql` | MySQL 드라이버 |
| `joblib` | 모델 직렬화 (pkl 저장/로드) |

### 환경변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `DB_HOST` | `localhost` | MySQL 호스트 |
| `DB_PORT` | `3306` | MySQL 포트 |
| `DB_NAME` | `kes` | 데이터베이스명 |
| `DB_USER` | `kes` | DB 사용자 |
| `DB_PASSWORD` | `kes1234` | DB 비밀번호 |

---

## 요구사항 매핑

| 요구사항 ID | 내용 | 구현 파일 | 구현 상태 |
|---|---|---|---|
| FR-001 | 배터리 데이터 전처리 | `data_loader.py`, `preprocessor.py` | ✅ 완료 |
| FR-002 | SOH 산출 및 학습 데이터 생성 | `preprocessor.py`, `feature_extractor.py` | ✅ 완료 |
| FR-003 | SOH 예측 모델 학습 | `train.py` | ✅ 완료 |
| FR-004 | 모델 성능 평가 | `train.py` (LOBO CV + 메트릭) | ✅ 완료 |
| FR-005 | AI 예측 결과 저장 | `db_uploader.py` | ✅ 완료 |
| SR-001 | AI 예측 결과 MySQL 저장 | `db_uploader.py` | ✅ 완료 |
| SR-004 | 예측 결과 관리 정보 구분 | `init.sql` (ai_prediction 스키마) | ✅ 완료 |
| SR-006 | Docker 기반 실행 환경 | `Dockerfile`, `docker-compose.yml` | ✅ 완료 |
