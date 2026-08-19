package com.kes.bms.repository;

import com.kes.bms.entity.AiModel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiModelRepository extends JpaRepository<AiModel, Long> {

    // 가장 최근 학습된 모델 조회
    Optional<AiModel> findTopByOrderByTrainedAtDesc();
}