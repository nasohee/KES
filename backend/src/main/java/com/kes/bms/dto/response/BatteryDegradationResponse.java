package com.kes.bms.dto.response;

import com.kes.bms.entity.AiPrediction;
import lombok.Getter;

@Getter
public class BatteryDegradationResponse {

    private final Integer cycle;
    private final Double actualCapacity;
    private final Double predictedCapacity;
    private final Double actualSoh;
    private final Double predictedSoh;
    private final String modelName;

    public BatteryDegradationResponse(AiPrediction prediction) {
        this.cycle = prediction.getCycle();
        this.actualCapacity = prediction.getActualCapacity();
        this.predictedCapacity = prediction.getPredictedCapacity();
        this.actualSoh = prediction.getActualSoh();
        this.predictedSoh = prediction.getPredictedSoh();
        this.modelName = prediction.getModelName();
    }
}