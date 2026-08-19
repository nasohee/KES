package com.kes.bms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "ai_model")
public class AiModel {

    // AI 모델 데이터 고유 ID
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 모델명
    @Column(name = "model_name", nullable = false, unique = true)
    private String modelName;

    // Root Mean Squared Error
    @Column(name = "rmse")
    private Double rmse;

    // Mean Absolute Error
    @Column(name = "mae")
    private Double mae;

    // 결정계수
    @Column(name = "r2_score")
    private Double r2Score;

    // 모델 학습 시각
    @Column(name = "trained_at")
    private LocalDateTime trainedAt;
}