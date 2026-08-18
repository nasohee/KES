package com.kes.bms.dto;

import com.kes.bms.entity.Battery;
import lombok.Getter;

@Getter
public class BatteryDetailResponse {

    private final String batteryId;
    private final Double initialCapacity;
    private final Double currentCapacity;
    private final Double currentSoh;
    private final String status;

    public BatteryDetailResponse(Battery battery) {
        this.batteryId = battery.getBatteryId();
        this.initialCapacity = battery.getInitialCapacity();
        this.currentCapacity = battery.getCurrentCapacity();
        this.currentSoh = battery.getCurrentSoh();
        this.status = battery.getStatus();
    }
}