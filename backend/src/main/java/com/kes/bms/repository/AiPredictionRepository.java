package com.kes.bms.repository;

import com.kes.bms.entity.AiPrediction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AiPredictionRepository
        extends JpaRepository<AiPrediction, Long> {

    List<AiPrediction> findByBattery_BatteryIdOrderByCycleAsc(
            String batteryId
    );
}