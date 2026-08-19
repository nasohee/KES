package com.kes.bms.dto.response;

import com.kes.bms.entity.AiModel;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class AiModelResponse {

    // 모델명
    private final String modelName;

    // Root Mean Squared Error
    private final Double rmse;

    // Mean Absolute Error
    private final Double mae;

    // 결정계수
    private final Double r2Score;

    // 학습 시각
    private final LocalDateTime trainedAt;

    public AiModelResponse(AiModel aiModel) {
        this.modelName = aiModel.getModelName();
        this.rmse = aiModel.getRmse();
        this.mae = aiModel.getMae();
        this.r2Score = aiModel.getR2Score();
        this.trainedAt = aiModel.getTrainedAt();
    }
}