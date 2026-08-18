package com.kes.bms.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class BatteryMeasurementWrapper {

    private final String batteryId;
    private final List<BatteryMeasurementResponse> measurements;

    public BatteryMeasurementWrapper(
            String batteryId,
            List<BatteryMeasurementResponse> measurements
    ) {
        this.batteryId = batteryId;
        this.measurements = measurements;
    }
}