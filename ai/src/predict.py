# 저장된 모델로 예측만 수행 [FR-003]

import os
import numpy as np
import pandas as pd
import joblib

from feature_extractor import get_target_column

def predict_soh(
    model,
    features_df: pd.DataFrame,
    processed_df: pd.DataFrame,
    model_name: str = 'XGBoost',
) -> pd.DataFrame:
    """
    학습 결과(train.py에서 생성된 predictions)를 기반으로
    최종 예측 결과 DataFrame을 생성한다.

    Args:
        model: 학습된 모델 (사용하지 않지만, 추후 새 데이터 예측용 인터페이스)
        features_df: train.py에서 반환된 all_predictions (predicted_capacity 포함)
        processed_df: preprocessor에서 생성된 전처리 데이터
        model_name: 모델명

    Returns:
        최종 예측 결과 DataFrame
        (battery_id, cycle, actual_capacity, predicted_capacity,
         actual_soh, predicted_soh, model_name, prediction_error, split_type)
    """
    predictions = features_df[['battery_id', 'cycle', 'capacity',
                                'predicted_capacity', 'split_type']].copy()

    predictions = predictions.rename(columns={'capacity': 'actual_capacity'})

    # SOH 계산 (정격 용량 2.0Ah 기준 통일)
    predictions['actual_soh'] = predictions.apply(
        lambda row: (row['actual_capacity'] / 2.0) * 100,
        axis=1
    )
    predictions['predicted_soh'] = predictions.apply(
        lambda row: (row['predicted_capacity'] / 2.0) * 100,
        axis=1
    )

    # 예측 오차 (절대값)
    predictions['prediction_error'] = np.abs(
        predictions['actual_capacity'] - predictions['predicted_capacity']
    )

    predictions['model_name'] = model_name

    # 컬럼 정리
    result = predictions[[
        'battery_id', 'cycle', 'actual_capacity', 'predicted_capacity',
        'actual_soh', 'predicted_soh', 'model_name',
        'prediction_error', 'split_type'
    ]].copy()

    result = result.sort_values(['battery_id', 'cycle']).reset_index(drop=True)

    return result


def load_model(model_path: str = 'models/xgboost_soh.pkl'):
    """저장된 모델을 로드한다."""
    if not os.path.isfile(model_path):
        raise FileNotFoundError(f"모델 파일을 찾을 수 없습니다: {model_path}")
    return joblib.load(model_path)