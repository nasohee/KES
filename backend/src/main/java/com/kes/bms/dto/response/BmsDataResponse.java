package com.kes.bms.dto.response;

import com.kes.bms.entity.BmsData;
import lombok.Getter;

@Getter
public class BmsDataResponse {

    private final Double time;
    private final Double voltage;
    private final Double current;
    private final Integer bmsSignal;
    private final String status;
    private final String alertMsg;

    public BmsDataResponse(BmsData bmsData) {
        this.time = bmsData.getTimeSec();
        this.voltage = bmsData.getVoltage();
        this.current = bmsData.getCurrent();
        this.bmsSignal = bmsData.getBmsSignal();
        this.status = bmsData.getStatus();
        this.alertMsg = bmsData.getAlertMsg();
    }
}