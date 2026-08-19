package com.kes.bms.service;

import com.kes.bms.dto.response.AiModelResponse;
import com.kes.bms.entity.AiModel;
import com.kes.bms.repository.AiModelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AiModelService {

    private final AiModelRepository aiModelRepository;

    @Transactional(readOnly = true)
    public AiModelResponse getLatestModel() {

        AiModel aiModel = aiModelRepository
                .findTopByOrderByTrainedAtDesc()
                .orElseThrow(() ->
                        new IllegalStateException("AI 모델 성능 데이터가 없습니다.")
                );

        return new AiModelResponse(aiModel);
    }
}