package com.kes.bms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "bms_data")
@Getter
@NoArgsConstructor
public class BmsData {

    // BMS 데이터 고유 ID
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 측정 시간 (초)
    @Column(name = "time_sec", nullable = false)
    private Double timeSec;

    // 배터리 전압 (V)
    @Column(name = "voltage")
    private Double voltage;

    // 배터리 전류 (A)
    @Column(name = "current_val")
    private Double current;

    // BMS 신호 (1=정상방전, 0=차단)
    @Column(name = "bms_signal")
    private Integer bmsSignal;

    // BMS 상태 (normal / warning)
    @Column(name = "status", length = 20)
    private String status;

    // 경보 메시지
    @Column(name = "alert_msg", length = 200)
    private String alertMsg;
}