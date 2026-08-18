# 피처 엔지니어링: metadata 피처 + 방전 곡선 피처 추출 [FR-002]

import os
import pandas as pd
import numpy as np

from data_loader import load_discharge_csv, get_data_dir


def extract_features(
    processed_df: pd.DataFrame,
    metadata_path: str = None
) -> pd.DataFrame:
    """
    전처리된 데이터에서 모델 학습용 피처를 추출한다.

    A. metadata 기반 피처 (cycle, re, rct, lag/rolling 피처)
    B. 방전 곡선 피처 (개별 CSV에서 추출)

    Args:
        processed_df: preprocessor.preprocess_data() 결과
        metadata_path: metadata.csv 경로 (개별 CSV 로드용, None이면 곡선 피처 스킵)

    Returns:
        학습용 피처 DataFrame (NaN 행 제거됨)
    """
    df = processed_df.copy()

    # A. metadata 기반 피처
    df = _add_metadata_features(df)

    # B. 방전 곡선 피처 (개별 CSV 활용)
    if metadata_path is not None:
        data_dir = get_data_dir(metadata_path)
        if os.path.isdir(data_dir):
            curve_features = _extract_curve_features(df, data_dir)
            df = df.merge(curve_features, on=['battery_id', 'cycle'], how='left')

    # NaN 행 제거 (첫 cycle 등 lag 피처 때문)
    df = df.dropna().reset_index(drop=True)

    return df


def _add_metadata_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    metadata 정보로부터 시계열 피처를 생성한다.
    """
    result = df.copy()

    # battery_id별로 lag/rolling 피처 생성
    features_list = []
    for battery_id, group in result.groupby('battery_id'):
        g = group.sort_values('cycle').copy()

        # Lag 피처: 이전 cycle의 capacity
        g['capacity_prev'] = g['capacity'].shift(1)

        # 차분 피처: capacity 변화량
        g['capacity_diff'] = g['capacity'].diff()

        # Rolling 피처: 최근 3 cycle 이동평균/표준편차
        g['rolling_mean_3'] = g['capacity'].rolling(window=3, min_periods=1).mean()
        g['rolling_std_3'] = g['capacity'].rolling(window=3, min_periods=1).std().fillna(0)

        # Re, Rct 변화량
        g['re_diff'] = g['re'].diff().fillna(0)
        g['rct_diff'] = g['rct'].diff().fillna(0)

        features_list.append(g)

    result = pd.concat(features_list, ignore_index=True)
    return result


def _extract_curve_features(
    df: pd.DataFrame,
    data_dir: str
) -> pd.DataFrame:
    """
    개별 discharge CSV 파일에서 방전 곡선 피처를 추출한다.

    추출 피처:
    - discharge_time: 총 방전 시간 (초)
    - avg_temperature: 방전 중 평균 온도 (°C)
    - max_temperature: 방전 중 최고 온도 (°C)
    - voltage_drop_rate: 전압 하강 기울기 (V/s)
    - energy: 적분 에너지 (Wh, ∫V×I dt 근사)

    Args:
        df: 전처리된 DataFrame (filename 컬럼 필요)
        data_dir: 개별 CSV 파일이 있는 디렉토리

    Returns:
        방전 곡선 피처 DataFrame (battery_id, cycle, + 피처 컬럼들)
    """
    records = []

    for _, row in df.iterrows():
        filename = row.get('filename')
        if pd.isna(filename):
            continue

        filepath = os.path.join(data_dir, str(filename).strip())
        if not os.path.isfile(filepath):
            continue

        try:
            curve_df = load_discharge_csv(filepath)
            features = _compute_curve_features(curve_df)
            features['battery_id'] = row['battery_id']
            features['cycle'] = row['cycle']
            records.append(features)
        except Exception:
            # 파일 읽기 실패 시 스킵
            continue

    if not records:
        return pd.DataFrame(columns=['battery_id', 'cycle'])

    return pd.DataFrame(records)


def _compute_curve_features(curve_df: pd.DataFrame) -> dict:
    """
    단일 방전 곡선 DataFrame에서 피처를 계산한다.
    """
    features = {}

    # 필요한 컬럼 존재 확인
    has_voltage = 'Voltage_measured' in curve_df.columns
    has_current = 'Current_measured' in curve_df.columns
    has_temp = 'Temperature_measured' in curve_df.columns
    has_time = 'Time' in curve_df.columns

    # 총 방전 시간
    if has_time and len(curve_df) > 0:
        features['discharge_time'] = curve_df['Time'].max() - curve_df['Time'].min()
    else:
        features['discharge_time'] = np.nan

    # 온도 통계
    if has_temp:
        features['avg_temperature'] = curve_df['Temperature_measured'].mean()
        features['max_temperature'] = curve_df['Temperature_measured'].max()
    else:
        features['avg_temperature'] = np.nan
        features['max_temperature'] = np.nan

    # 전압 하강 기울기 (선형 회귀 기울기 근사)
    if has_voltage and has_time and len(curve_df) > 1:
        time_vals = curve_df['Time'].values
        volt_vals = curve_df['Voltage_measured'].values
        # 유효한 값만 사용
        mask = np.isfinite(time_vals) & np.isfinite(volt_vals)
        if mask.sum() > 1:
            t = time_vals[mask]
            v = volt_vals[mask]
            # np.polyfit 1차 (기울기)
            slope, _ = np.polyfit(t, v, 1)
            features['voltage_drop_rate'] = slope
        else:
            features['voltage_drop_rate'] = np.nan
    else:
        features['voltage_drop_rate'] = np.nan

    # 적분 에너지 (Wh) = ∫ V × |I| dt (사다리꼴 적분)
    if has_voltage and has_current and has_time and len(curve_df) > 1:
        time_vals = curve_df['Time'].values
        volt_vals = curve_df['Voltage_measured'].values
        curr_vals = np.abs(curve_df['Current_measured'].values)

        power = volt_vals * curr_vals  # W
        # 사다리꼴 적분 (초 → 시간 변환 포함)
        energy_wh = np.trapz(power, time_vals) / 3600.0
        features['energy'] = energy_wh
    else:
        features['energy'] = np.nan

    return features


def get_feature_columns() -> list:
    """
    모델 학습에 사용되는 피처 컬럼 목록을 반환한다.
    """
    return [
        'cycle', 're', 'rct', 'ambient_temp',
        'capacity_prev', 'capacity_diff',
        'rolling_mean_3', 'rolling_std_3',
        're_diff', 'rct_diff',
        'discharge_time', 'avg_temperature', 'max_temperature',
        'voltage_drop_rate', 'energy',
    ]


def get_target_column() -> str:
    """모델의 예측 대상 컬럼명을 반환한다."""
    return 'capacity'