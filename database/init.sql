-- KES Battery Management System - Database Schema
-- AI 예측 결과 및 배터리 데이터 저장용 테이블

-- 배터리 마스터 테이블
CREATE TABLE IF NOT EXISTS battery (
    battery_id       VARCHAR(10) PRIMARY KEY,
    initial_capacity DOUBLE      COMMENT '최초 측정 Capacity (Ah)',
    current_capacity DOUBLE      COMMENT '최근 측정 Capacity (Ah)',
    current_soh      DOUBLE      COMMENT '현재 SOH (%)',
    status           VARCHAR(20) DEFAULT 'normal' COMMENT '배터리 상태 (normal/warning/critical)',
    updated_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 배터리 실측 데이터 (Cycle별)
CREATE TABLE IF NOT EXISTS battery_measurement (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    battery_id       VARCHAR(10) NOT NULL,
    cycle            INT         NOT NULL,
    capacity         DOUBLE      COMMENT '방전 Capacity (Ah)',
    re               DOUBLE      COMMENT '전해질 저항 Re (Ohm)',
    rct              DOUBLE      COMMENT '전하전달 저항 Rct (Ohm)',
    soh              DOUBLE      COMMENT 'State of Health (%)',
    ambient_temp     DOUBLE      COMMENT '주변 온도 (°C)',
    measured_at      TIMESTAMP   NULL COMMENT '측정 시각',
    FOREIGN KEY (battery_id) REFERENCES battery(battery_id),
    UNIQUE KEY uk_battery_cycle (battery_id, cycle)
);

-- AI 예측 결과
CREATE TABLE IF NOT EXISTS ai_prediction (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    battery_id         VARCHAR(10) NOT NULL,
    cycle              INT         NOT NULL,
    actual_capacity    DOUBLE      COMMENT '실제 Capacity (Ah)',
    predicted_capacity DOUBLE      COMMENT 'AI 예측 Capacity (Ah)',
    actual_soh         DOUBLE      COMMENT '실제 SOH (%)',
    predicted_soh      DOUBLE      COMMENT 'AI 예측 SOH (%)',
    model_name         VARCHAR(50) COMMENT '사용된 모델명',
    prediction_error   DOUBLE      COMMENT '예측 오차 (절대값)',
    split_type         VARCHAR(10) COMMENT 'train 또는 test',
    created_at         TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (battery_id) REFERENCES battery(battery_id),
    UNIQUE KEY uk_prediction (battery_id, cycle, model_name)
);

-- AI 모델 정보
CREATE TABLE IF NOT EXISTS ai_model (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    model_name   VARCHAR(50) UNIQUE NOT NULL,
    rmse         DOUBLE  COMMENT 'Root Mean Squared Error',
    mae          DOUBLE  COMMENT 'Mean Absolute Error',
    r2_score     DOUBLE  COMMENT 'R² Score',
    trained_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BMS 시뮬레이션 데이터
CREATE TABLE IF NOT EXISTS bms_data (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    time_sec     DOUBLE      NOT NULL COMMENT '시간 (초)',
    voltage      DOUBLE      COMMENT '전압 (V)',
    current_val  DOUBLE      COMMENT '전류 (A)',
    bms_signal   INT         COMMENT 'BMS 신호 (1=정상방전, 0=차단)',
    status       VARCHAR(20) DEFAULT 'normal' COMMENT '상태 (normal/warning)',
    alert_msg    VARCHAR(200) COMMENT '경보 메시지'
);
