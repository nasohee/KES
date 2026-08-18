# metadata·개별 CSV 로드, battery_id별 분리 [FR-001]

import os
import pandas as pd
import numpy as np
import ast
import re


def load_metadata(path: str) -> pd.DataFrame:
    """
    metadata.csv를 로드하고 기본 정리를 수행한다.

    Args:
        path: metadata.csv 파일 경로

    Returns:
        정리된 DataFrame (type, battery_id, test_id, uid, filename,
        Capacity, Re, Rct, ambient_temperature, start_time)
    """
    df = pd.read_csv(path)

    # 컬럼명 공백 제거
    df.columns = df.columns.str.strip()

    # 타입 정리
    df['type'] = df['type'].str.strip()
    df['battery_id'] = df['battery_id'].str.strip()

    # 숫자 컬럼 변환
    df['Capacity'] = pd.to_numeric(df['Capacity'], errors='coerce')
    df['Re'] = pd.to_numeric(df['Re'], errors='coerce')
    df['Rct'] = pd.to_numeric(df['Rct'], errors='coerce')
    df['test_id'] = pd.to_numeric(df['test_id'], errors='coerce').astype(int)
    df['uid'] = pd.to_numeric(df['uid'], errors='coerce').astype(int)
    df['ambient_temperature'] = pd.to_numeric(df['ambient_temperature'], errors='coerce')

    # start_time 파싱 (numpy 배열 형태 문자열 → datetime)
    df['start_datetime'] = df['start_time'].apply(_parse_start_time)

    return df


def _parse_start_time(time_str: str) -> pd.Timestamp:
    """
    '[2010. 7. 21. 15. 0. 35.093]' 형태의 문자열을 datetime으로 변환한다.
    """
    try:
        # 대괄호 제거, 공백 정리
        cleaned = time_str.strip('[]')
        # 여러 공백을 하나로 합치고 분리
        parts = re.split(r'[,\s]+', cleaned.strip())
        # 빈 문자열 제거
        parts = [p for p in parts if p]
        # 숫자 변환
        nums = [float(p) for p in parts]

        if len(nums) >= 6:
            year, month, day = int(nums[0]), int(nums[1]), int(nums[2])
            hour, minute = int(nums[3]), int(nums[4])
            second = int(nums[5])
            microsecond = int((nums[5] - second) * 1_000_000)
            return pd.Timestamp(year, month, day, hour, minute, second, microsecond)
    except Exception:
        pass
    return pd.NaT


def load_discharge_csv(filepath: str) -> pd.DataFrame:
    """
    개별 discharge CSV 파일을 로드한다.

    컬럼: Voltage_measured, Current_measured, Temperature_measured,
          Current_load, Voltage_load, Time

    Args:
        filepath: 개별 CSV 파일 경로

    Returns:
        방전 데이터 DataFrame
    """
    df = pd.read_csv(filepath)
    df.columns = df.columns.str.strip()
    # 숫자 변환
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    return df


def load_bms_data(path: str) -> pd.DataFrame:
    """
    PSIM_BMS_Simulation_Data.csv를 로드한다.

    컬럼: Time (s), Voltage_V1 (V), Current_I1 (A), BMS_Signal

    Args:
        path: BMS 시뮬레이션 데이터 CSV 경로

    Returns:
        BMS 데이터 DataFrame (컬럼명 정규화됨)
    """
    df = pd.read_csv(path)
    df.columns = df.columns.str.strip()

    # 컬럼명 정규화
    rename_map = {
        'Time (s)': 'time_sec',
        'Voltage_V1 (V)': 'voltage',
        'Current_I1 (A)': 'current_val',
        'BMS_Signal': 'bms_signal',
    }
    df = df.rename(columns=rename_map)

    return df


def get_battery_ids(metadata: pd.DataFrame) -> list:
    """
    metadata에서 고유 battery_id 목록을 반환한다.
    """
    return sorted(metadata['battery_id'].unique().tolist())


def get_data_dir(metadata_path: str) -> str:
    """
    metadata.csv 경로로부터 개별 CSV가 있는 data 디렉토리 경로를 반환한다.
    """
    base_dir = os.path.dirname(metadata_path)
    return os.path.join(base_dir, 'data')