# XGBoost 학습 + 셀단위 교차검증 [FR-003, FR-004]

import os
import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from xgboost import XGBRegressor
import joblib

from feature_extractor import get_feature_columns, get_target_column


def train_model(
    features_df: pd.DataFrame,
    model_save_dir: str = 'models',
) -> tuple:
    """
    XGBoost 모델을 학습하고 평가한다.

    학습 전략: Leave-One-Battery-Out (LOBO) 교차검증
    - 2개 배터리로 학습 → 1개 배터리로 테스트
    - 최종 모델은 전체 데이터로 학습

    Args:
        features_df: feature_extractor.extract_features() 결과
        model_save_dir: 모델 저장 디렉토리

    Returns:
        (model, model_meta, cv_predictions)
        - model: 학습된 XGBRegressor
        - model_meta: 모델 메타정보 dict
        - cv_predictions: CV 예측 결과 DataFrame
    """
    feature_cols = _get_available_features(features_df)
    target_col = get_target_column()
    battery_ids = sorted(features_df['battery_id'].unique())

    print(f"[Train] 배터리: {battery_ids}")
    print(f"[Train] 피처 수: {len(feature_cols)}")
    print(f"[Train] 전체 샘플 수: {len(features_df)}")

    # ── LOBO 교차검증 ──
    cv_predictions = []
    cv_metrics = []

    for test_battery in battery_ids:
        train_batteries = [b for b in battery_ids if b != test_battery]

        train_mask = features_df['battery_id'].isin(train_batteries)
        test_mask = features_df['battery_id'] == test_battery

        X_train = features_df.loc[train_mask, feature_cols]
        y_train = features_df.loc[train_mask, target_col]
        X_test = features_df.loc[test_mask, feature_cols]
        y_test = features_df.loc[test_mask, target_col]

        model = _create_model()
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)

        # 메트릭 계산
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        print(f"  Fold (test={test_battery}): RMSE={rmse:.4f}, MAE={mae:.4f}, R²={r2:.4f}")

        cv_metrics.append({'test_battery': test_battery, 'rmse': rmse, 'mae': mae, 'r2': r2})

        # 예측 결과 저장
        test_data = features_df.loc[test_mask].copy()
        test_data['predicted_capacity'] = y_pred
        test_data['split_type'] = 'test'
        cv_predictions.append(test_data)

    # CV 평균 메트릭
    avg_rmse = np.mean([m['rmse'] for m in cv_metrics])
    avg_mae = np.mean([m['mae'] for m in cv_metrics])
    avg_r2 = np.mean([m['r2'] for m in cv_metrics])
    print(f"\n[CV 평균] RMSE={avg_rmse:.4f}, MAE={avg_mae:.4f}, R²={avg_r2:.4f}")

    # ── 최종 모델: 전체 데이터로 학습 ──
    X_all = features_df[feature_cols]
    y_all = features_df[target_col]

    final_model = _create_model()
    final_model.fit(X_all, y_all)

    # 전체 데이터 예측 (train split)
    y_pred_all = final_model.predict(X_all)
    train_rmse = np.sqrt(mean_squared_error(y_all, y_pred_all))
    train_mae = mean_absolute_error(y_all, y_pred_all)
    train_r2 = r2_score(y_all, y_pred_all)
    print(f"[Final] Train RMSE={train_rmse:.4f}, MAE={train_mae:.4f}, R²={train_r2:.4f}")

    # train 예측 결과
    train_predictions = features_df.copy()
    train_predictions['predicted_capacity'] = y_pred_all
    train_predictions['split_type'] = 'train'

    # CV 예측과 합치기 (test split 우선)
    cv_pred_df = pd.concat(cv_predictions, ignore_index=True)
    all_predictions = _merge_predictions(train_predictions, cv_pred_df)

    # 모델 저장
    os.makedirs(model_save_dir, exist_ok=True)
    model_path = os.path.join(model_save_dir, 'xgboost_soh.pkl')
    joblib.dump(final_model, model_path)
    print(f"[Save] 모델 저장: {model_path}")

    # 피처 중요도 출력
    _print_feature_importance(final_model, feature_cols)

    # 모델 메타정보
    model_meta = {
        'model_name': 'XGBoost',
        'rmse': avg_rmse,
        'mae': avg_mae,
        'r2_score': avg_r2,
    }

    return final_model, model_meta, all_predictions


def _create_model() -> XGBRegressor:
    """XGBoost 모델 인스턴스를 생성한다."""
    return XGBRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbosity=0,
    )


def _get_available_features(df: pd.DataFrame) -> list:
    """
    DataFrame에 실제 존재하는 피처 컬럼만 반환한다.
    (방전 곡선 피처가 없을 수 있음)
    """
    all_features = get_feature_columns()
    return [col for col in all_features if col in df.columns]


def _merge_predictions(
    train_df: pd.DataFrame,
    cv_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Train 예측과 CV(test) 예측을 병합한다.
    CV 예측이 있는 행은 test split으로 표시한다.
    """
    # CV 예측 결과의 (battery_id, cycle) 집합
    cv_keys = set(zip(cv_df['battery_id'], cv_df['cycle']))

    # train에서 CV에 이미 있는 행 제거
    mask = train_df.apply(
        lambda r: (r['battery_id'], r['cycle']) not in cv_keys, axis=1
    )
    train_only = train_df[mask]

    return pd.concat([cv_df, train_only], ignore_index=True)


def _print_feature_importance(model: XGBRegressor, feature_cols: list):
    """피처 중요도를 출력한다."""
    importances = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]

    print("\n[피처 중요도]")
    for i, idx in enumerate(sorted_idx[:10]):
        print(f"  {i+1}. {feature_cols[idx]}: {importances[idx]:.4f}")