package com.kes.bms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "battery_measurement",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_battery_cycle",
                        columnNames = {"battery_id", "cycle"}
                )
        }
)
@Getter
@NoArgsConstructor
public class BatteryMeasurement {

    // 실측 데이터 고유 ID
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 배터리 아이디
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "battery_id", nullable = false)
    private Battery battery;

    // 측정 Cycle
    @Column(name = "cycle", nullable = false)
    private Integer cycle;

    // 해당 Cycle의 방전 Capacity (Ah)
    @Column(name = "capacity")
    private Double capacity;

    // 전해질 저항 Re (Ohm)
    @Column(name = "re")
    private Double re;

    // 전하전달 저항 Rct (Ohm)
    @Column(name = "rct")
    private Double rct;

    // 해당 Cycle의 SOH (%)
    @Column(name = "soh")
    private Double soh;

    // 주변 온도 (°C)
    @Column(name = "ambient_temp")
    private Double ambientTemp;

    // 측정 시각
    @Column(name = "measured_at")
    private LocalDateTime measuredAt;
}