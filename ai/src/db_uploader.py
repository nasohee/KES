# 예측 결과 MySQL 적재 [FR-005, SR-001]
# └ 결과에 split_type(train/test), error_abs 포함

import os
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text


def get_db_engine():
    """
    환경변수에서 DB 접속 정보를 읽어 SQLAlchemy 엔진을 생성한다.
    """
    host = os.environ.get('DB_HOST', 'localhost')
    port = os.environ.get('DB_PORT', '3306')
    dbname = os.environ.get('DB_NAME', 'kes')
    user = os.environ.get('DB_USER', 'kes')
    password = os.environ.get('DB_PASSWORD', 'kes1234')

    url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{dbname}"
    engine = create_engine(url, echo=False)
    return engine


def wait_for_db(engine, max_retries: int = 30, delay: int = 2):
    """
    DB 연결이 준비될 때까지 대기한다.
    (Docker Compose에서 db 컨테이너가 먼저 뜨길 기다리는 용도)
    """
    import time

    for i in range(max_retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"[DB] 연결 성공 (시도 {i+1})")
            return True
        except Exception as e:
            print(f"[DB] 연결 대기 중... ({i+1}/{max_retries}): {e}")
            time.sleep(delay)

    raise ConnectionError(f"DB 연결 실패: {max_retries}회 시도 후 포기")


def upload_battery_master(summary_df: pd.DataFrame, engine=None):
    """
    battery 마스터 테이블에 배터리 기본 정보를 저장한다.

    Args:
        summary_df: preprocessor.get_battery_summary() 결과
        engine: SQLAlchemy 엔진 (None이면 자동 생성)
    """
    if engine is None:
        engine = get_db_engine()

    with engine.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        conn.execute(text("TRUNCATE TABLE battery;"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))

    summary_df.to_sql('battery', engine, if_exists='append', index=False)
    print(f"[DB] battery 테이블 적재: {len(summary_df)}건")


def upload_measurements(processed_df: pd.DataFrame, engine=None):
    """
    battery_measurement 테이블에 실측 데이터를 저장한다.

    Args:
        processed_df: preprocessor.preprocess_data() 결과
        engine: SQLAlchemy 엔진
    """
    if engine is None:
        engine = get_db_engine()

    upload_df = processed_df[[
        'battery_id', 'cycle', 'capacity', 're', 'rct', 'soh',
        'ambient_temp', 'start_datetime'
    ]].copy()

    upload_df = upload_df.rename(columns={'start_datetime': 'measured_at'})

    # NaT를 None으로 변환 (MySQL 호환)
    upload_df['measured_at'] = upload_df['measured_at'].where(
        upload_df['measured_at'].notna(), None
    )

    with engine.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        conn.execute(text("TRUNCATE TABLE battery_measurement;"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))

    upload_df.to_sql('battery_measurement', engine, if_exists='append', index=False)
    print(f"[DB] battery_measurement 테이블 적재: {len(upload_df)}건")


def upload_predictions(predictions_df: pd.DataFrame, engine=None):
    """
    ai_prediction 테이블에 AI 예측 결과를 저장한다.

    Args:
        predictions_df: predict.predict_soh() 결과
        engine: SQLAlchemy 엔진
    """
    if engine is None:
        engine = get_db_engine()

    upload_df = predictions_df[[
        'battery_id', 'cycle', 'actual_capacity', 'predicted_capacity',
        'actual_soh', 'predicted_soh', 'model_name',
        'prediction_error', 'split_type'
    ]].copy()

    with engine.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        conn.execute(text("TRUNCATE TABLE ai_prediction;"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))

    upload_df.to_sql('ai_prediction', engine, if_exists='append', index=False)
    print(f"[DB] ai_prediction 테이블 적재: {len(upload_df)}건")


def upload_model_info(model_meta: dict, engine=None):
    """
    ai_model 테이블에 모델 메타 정보를 저장한다.

    Args:
        model_meta: {'model_name': str, 'rmse': float, 'mae': float, 'r2_score': float}
        engine: SQLAlchemy 엔진
    """
    if engine is None:
        engine = get_db_engine()

    model_df = pd.DataFrame([model_meta])

    with engine.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        conn.execute(text("TRUNCATE TABLE ai_model;"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))

    model_df.to_sql('ai_model', engine, if_exists='append', index=False)
    print(f"[DB] ai_model 테이블 적재: {model_meta['model_name']}")


def upload_bms_data(bms_df: pd.DataFrame, engine=None):
    """
    bms_data 테이블에 BMS 시뮬레이션 데이터를 저장한다.
    이상 탐지 로직을 적용하여 status, alert_msg를 추가한다.

    이상 조건:
    - Voltage < 3.0V → warning (저전압 경고)
    - BMS_Signal 0→1 또는 1→0 변화 시점 → warning (신호 변경)

    Args:
        bms_df: data_loader.load_bms_data() 결과
        engine: SQLAlchemy 엔진
    """
    if engine is None:
        engine = get_db_engine()

    df = bms_df.copy()

    # 이상 탐지
    df['status'] = 'normal'
    df['alert_msg'] = None

    # 저전압 경고 (3.0V 미만)
    low_voltage_mask = df['voltage'] < 3.0
    df.loc[low_voltage_mask, 'status'] = 'warning'
    df.loc[low_voltage_mask, 'alert_msg'] = '저전압 경고: 전압이 3.0V 미만입니다'

    # BMS 신호 변경 감지
    if 'bms_signal' in df.columns:
        signal_change = df['bms_signal'].diff().abs() > 0
        signal_change_mask = signal_change & ~low_voltage_mask
        df.loc[signal_change_mask, 'status'] = 'warning'
        df.loc[signal_change_mask, 'alert_msg'] = 'BMS 신호 변경 감지'

    # BMS 차단 상태 (signal=0이고 저전압이 아닌 경우)
    cutoff_mask = (df['bms_signal'] == 0) & ~low_voltage_mask & ~signal_change
    df.loc[cutoff_mask, 'status'] = 'warning'
    df.loc[cutoff_mask, 'alert_msg'] = 'BMS 차단 상태'

    with engine.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        conn.execute(text("TRUNCATE TABLE bms_data;"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))

    df.to_sql('bms_data', engine, if_exists='append', index=False)
    print(f"[DB] bms_data 테이블 적재: {len(df)}건")