package com.kes.bms.dto.response;

import com.kes.bms.entity.BmsData;
import lombok.Getter;

@Getter
public class BmsStatusResponse {

    private final String status;
    private final Double voltage;
    private final Double current;
    private final Integer bmsSignal;
    private final Boolean alert;
    private final String message;

    public BmsStatusResponse(BmsData bmsData) {
        this.status = bmsData.getStatus();
        this.voltage = bmsData.getVoltage();
        this.current = bmsData.getCurrent();
        this.bmsSignal = bmsData.getBmsSignal();

        // warning 상태이면 alert=true
        this.alert = "warning".equalsIgnoreCase(bmsData.getStatus());

        // 경보 메시지가 있으면 해당 메시지 반환
        // 없으면 정상 상태 메시지 반환
        this.message = bmsData.getAlertMsg() != null
                ? bmsData.getAlertMsg()
                : "정상 상태입니다.";
    }
}