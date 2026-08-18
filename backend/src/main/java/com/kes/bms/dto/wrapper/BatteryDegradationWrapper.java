package com.kes.bms.dto.wrapper;

import com.kes.bms.dto.response.BatteryDegradationResponse;
import lombok.Getter;

import java.util.List;

@Getter
public class BatteryDegradationWrapper {

    private final String batteryId;
    private final List<BatteryDegradationResponse> degradation;

    public BatteryDegradationWrapper(
            String batteryId,
            List<BatteryDegradationResponse> degradation
    ) {
        this.batteryId = batteryId;
        this.degradation = degradation;
    }
}