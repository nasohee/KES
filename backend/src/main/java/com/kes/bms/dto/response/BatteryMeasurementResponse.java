package com.kes.bms.dto.response;

import com.kes.bms.entity.BatteryMeasurement;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class BatteryMeasurementResponse {

    private final Integer cycle;
    private final Double capacity;
    private final Double re;
    private final Double rct;
    private final Double soh;
    private final Double ambientTemp;
    private final LocalDateTime measuredAt;

    public BatteryMeasurementResponse(BatteryMeasurement measurement) {
        this.cycle = measurement.getCycle();
        this.capacity = measurement.getCapacity();
        this.re = measurement.getRe();
        this.rct = measurement.getRct();
        this.soh = measurement.getSoh();
        this.ambientTemp = measurement.getAmbientTemp();
        this.measuredAt = measurement.getMeasuredAt();
    }
}