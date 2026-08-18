package com.kes.bms.dto.wrapper;

import com.kes.bms.dto.response.BatteryMeasurementResponse;
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