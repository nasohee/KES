package com.kes.bms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "ai_prediction",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_prediction",
                        columnNames = {"battery_id", "cycle", "model_name"}
                )
        }
)
@Getter
@NoArgsConstructor
public class AiPrediction {

    // AI 예측 결과 고유 ID
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 배터리 아이디
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "battery_id", nullable = false)
    private Battery battery;

    // 예측 대상 Cycle
    @Column(name = "cycle", nullable = false)
    private Integer cycle;

    // 실제 Capacity (Ah)
    @Column(name = "actual_capacity")
    private Double actualCapacity;

    // AI 예측 Capacity (Ah)
    @Column(name = "predicted_capacity")
    private Double predictedCapacity;

    // 실제 SOH (%)
    @Column(name = "actual_soh")
    private Double actualSoh;

    // AI 예측 SOH (%)
    @Column(name = "predicted_soh")
    private Double predictedSoh;

    // 사용한 AI 모델명
    @Column(name = "model_name", length = 50)
    private String modelName;

    // 예측 오차
    @Column(name = "prediction_error")
    private Double predictionError;

    // train / test 구분
    @Column(name = "split_type", length = 10)
    private String splitType;

    // 예측 결과 생성 시각
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}