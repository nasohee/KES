# 위 단계 순서대로 실행하는 진입점(오케스트레이터)

import os
import sys

# src 디렉토리를 import path에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from data_loader import load_metadata, load_bms_data, get_data_dir
from preprocessor import preprocess_data, get_battery_summary
from feature_extractor import extract_features
from train import train_model
from predict import predict_soh
from db_uploader import (
    get_db_engine, wait_for_db,
    upload_battery_master, upload_measurements,
    upload_predictions, upload_model_info, upload_bms_data,
)


def main():
    print("=" * 60)
    print("KES Battery SOH Prediction Pipeline")
    print("=" * 60)

    # ── 경로 설정 ──
    base_dir = os.path.dirname(os.path.abspath(__file__))
    metadata_path = os.path.join(base_dir, 'data', 'raw', 'metadata.csv')
    bms_path = os.path.join(base_dir, 'data', 'raw', 'PSIM_BMS_Simulation_Data.csv')
    model_dir = os.path.join(base_dir, 'models')

    # 경로 존재 확인
    if not os.path.isfile(metadata_path):
        print(f"[ERROR] metadata.csv를 찾을 수 없습니다: {metadata_path}")
        sys.exit(1)
    if not os.path.isfile(bms_path):
        print(f"[WARNING] BMS 데이터를 찾을 수 없습니다: {bms_path}")
        bms_path = None

    # ── Step 1: 데이터 로드 ──
    print("\n[Step 1] 데이터 로드...")
    metadata = load_metadata(metadata_path)
    print(f"  metadata: {len(metadata)}행 로드")

    bms_raw = None
    if bms_path:
        bms_raw = load_bms_data(bms_path)
        print(f"  BMS 데이터: {len(bms_raw)}행 로드")

    # ── Step 2: 전처리 + SOH 산출 ──
    print("\n[Step 2] 전처리 + SOH 산출...")
    processed = preprocess_data(metadata)
    print(f"  전처리 완료: {len(processed)}행 (discharge cycles)")

    battery_summary = get_battery_summary(processed)
    print(f"  배터리 요약:")
    for _, row in battery_summary.iterrows():
        print(f"    {row['battery_id']}: "
              f"초기 {row['initial_capacity']:.3f}Ah → "
              f"현재 {row['current_capacity']:.3f}Ah "
              f"(SOH {row['current_soh']:.1f}%, {row['status']})")

    # ── Step 3: 피처 엔지니어링 ──
    print("\n[Step 3] 피처 엔지니어링...")
    features = extract_features(processed, metadata_path)
    print(f"  피처 추출 완료: {len(features)}행, {features.shape[1]}컬럼")

    # ── Step 4: 모델 학습 + 평가 ──
    print("\n[Step 4] XGBoost 모델 학습...")
    model, model_meta, all_predictions = train_model(features, model_dir)

    # ── Step 5: 예측 결과 생성 ──
    print("\n[Step 5] 예측 결과 생성...")
    predictions = predict_soh(model, all_predictions, processed)
    print(f"  예측 결과: {len(predictions)}건")
    print(f"  평균 예측 오차: {predictions['prediction_error'].mean():.4f} Ah")

    # ── Step 6: DB 저장 ──
    print("\n[Step 6] MySQL 적재...")
    try:
        engine = get_db_engine()
        wait_for_db(engine)

        upload_battery_master(battery_summary, engine)
        upload_measurements(processed, engine)
        upload_predictions(predictions, engine)
        upload_model_info(model_meta, engine)

        if bms_raw is not None:
            upload_bms_data(bms_raw, engine)

        print("\n[완료] 모든 데이터가 MySQL에 적재되었습니다.")
    except Exception as e:
        print(f"\n[WARNING] DB 적재 실패: {e}")
        print("  → 모델 학습과 예측은 정상 완료되었습니다.")
        print("  → DB 연결 설정을 확인하세요 (환경변수: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)")

    print("\n" + "=" * 60)
    print("Pipeline 완료!")
    print("=" * 60)


if __name__ == '__main__':
    main()