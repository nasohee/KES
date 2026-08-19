# test_id 정렬, SOH 라벨 생성, Re/Rct 매칭 [FR-002]

import pandas as pd
import numpy as np


def preprocess_data(metadata: pd.DataFrame) -> pd.DataFrame:
    """
    metadata를 전처리하여 학습에 사용할 수 있는 형태로 변환한다.

    처리 단계:
    1. discharge 행만 필터링
    2. Capacity == 0 이상치 제거
    3. battery_id별 cycle 번호 매핑
    4. impedance 데이터(Re, Rct) 매칭
    5. SOH 산출

    Args:
        metadata: data_loader.load_metadata()로 로드된 DataFrame

    Returns:
        전처리된 DataFrame
        (battery_id, cycle, capacity, re, rct, soh, ambient_temp, filename, start_datetime)
    """
    # 1. discharge 행만 추출
    discharge_df = metadata[metadata['type'] == 'discharge'].copy()

    # 2. Capacity 이상치 제거 (0 또는 NaN)
    discharge_df = discharge_df[
        (discharge_df['Capacity'].notna()) &
        (discharge_df['Capacity'] > 0)
    ].copy()

    # 3. impedance 데이터 추출 (Re, Rct 매칭용)
    impedance_df = metadata[metadata['type'] == 'impedance'][
        ['battery_id', 'test_id', 'Re', 'Rct']
    ].copy()

    # 4. battery_id별 처리
    processed_list = []
    for battery_id, group in discharge_df.groupby('battery_id'):
        processed = _process_single_battery(battery_id, group, impedance_df)
        processed_list.append(processed)

    result = pd.concat(processed_list, ignore_index=True)
    result = result.sort_values(['battery_id', 'cycle']).reset_index(drop=True)

    return result


def _process_single_battery(
    battery_id: str,
    discharge_group: pd.DataFrame,
    impedance_df: pd.DataFrame
) -> pd.DataFrame:
    """
    단일 배터리의 discharge 데이터를 처리한다.
    """
    df = discharge_group.sort_values('test_id').reset_index(drop=True)

    # cycle 번호 매핑 (0부터 시작)
    df['cycle'] = range(len(df))

    # 해당 배터리의 impedance 데이터
    bat_imp = impedance_df[impedance_df['battery_id'] == battery_id].copy()
    bat_imp = bat_imp.sort_values('test_id')

    # Re, Rct를 가장 가까운 이전 impedance 측정으로 매칭
    df['re'] = np.nan
    df['rct'] = np.nan

    for idx, row in df.iterrows():
        # 현재 test_id보다 작거나 같은 impedance 중 가장 가까운 것
        prior_imp = bat_imp[bat_imp['test_id'] <= row['test_id']]
        if len(prior_imp) > 0:
            latest = prior_imp.iloc[-1]
            df.at[idx, 're'] = latest['Re']
            df.at[idx, 'rct'] = latest['Rct']

    # forward-fill로 남은 NaN 보간
    df['re'] = df['re'].ffill()
    df['rct'] = df['rct'].ffill()
    # 최초 impedance가 없는 경우 backward-fill
    df['re'] = df['re'].bfill()
    df['rct'] = df['rct'].bfill()

    # SOH 산출: (현재 Capacity / 정격 Capacity) * 100
    # NASA 데이터셋 배터리의 정격 용량(Rated Capacity)은 2.0 Ah
    rated_capacity = 2.0
    df['soh'] = (df['Capacity'] / rated_capacity) * 100.0

    # 결과 컬럼 정리
    result = df[[
        'battery_id', 'cycle', 'Capacity', 're', 'rct', 'soh',
        'ambient_temperature', 'filename', 'start_datetime'
    ]].copy()

    result = result.rename(columns={
        'Capacity': 'capacity',
        'ambient_temperature': 'ambient_temp',
    })

    return result


def get_initial_capacities(processed_df: pd.DataFrame) -> dict:
    """
    배터리별 최초 Capacity를 반환한다.

    Returns:
        {battery_id: initial_capacity} 딕셔너리
    """
    result = {}
    for battery_id, group in processed_df.groupby('battery_id'):
        first_row = group.sort_values('cycle').iloc[0]
        result[battery_id] = first_row['capacity']
    return result


def get_battery_summary(processed_df: pd.DataFrame) -> pd.DataFrame:
    """
    배터리별 요약 정보를 생성한다.
    (battery 마스터 테이블 적재용)

    Returns:
        battery_id, initial_capacity, current_capacity, current_soh, status
    """
    summaries = []
    for battery_id, group in processed_df.groupby('battery_id'):
        sorted_group = group.sort_values('cycle')
        initial_cap = sorted_group.iloc[0]['capacity']
        current_cap = sorted_group.iloc[-1]['capacity']
        current_soh = sorted_group.iloc[-1]['soh']

        # 상태 판단
        if current_soh >= 80:
            status = 'normal'
        elif current_soh >= 70:
            status = 'warning'
        else:
            status = 'critical'

        summaries.append({
            'battery_id': battery_id,
            'initial_capacity': initial_cap,
            'current_capacity': current_cap,
            'current_soh': current_soh,
            'status': status,
        })

    return pd.DataFrame(summaries)