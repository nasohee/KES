package com.kes.bms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "battery")
@Getter
@NoArgsConstructor
public class Battery {

    // 배터리 아이디 (예: B0005)
    @Id
    @Column(name = "battery_id", length = 10)
    private String batteryId;

    // 최초 측정 Capacity (Ah)
    @Column(name = "initial_capacity")
    private Double initialCapacity;

    // 최근 측정 Capacity (Ah)
    @Column(name = "current_capacity")
    private Double currentCapacity;

    // 현재 SOH (%)
    @Column(name = "current_soh")
    private Double currentSoh;

    // 배터리 상태 (normal / warning / critical)
    @Column(name = "status", length = 20)
    private String status;

    // 마지막 데이터 갱신 시각
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}