package com.kes.bms.service;

import com.kes.bms.dto.response.BatteryDegradationResponse;
import com.kes.bms.dto.response.BatteryDetailResponse;
import com.kes.bms.dto.response.BatteryListResponse;
import com.kes.bms.dto.response.BatteryMeasurementResponse;
import com.kes.bms.dto.wrapper.BatteryDegradationWrapper;
import com.kes.bms.dto.wrapper.BatteryListWrapper;
import com.kes.bms.dto.wrapper.BatteryMeasurementWrapper;
import com.kes.bms.entity.Battery;
import com.kes.bms.exception.BatteryNotFoundException;
import com.kes.bms.repository.AiPredictionRepository;
import com.kes.bms.repository.BatteryMeasurementRepository;
import com.kes.bms.repository.BatteryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BatteryService {

    private final BatteryRepository batteryRepository;
    private final BatteryMeasurementRepository batteryMeasurementRepository;
    private final AiPredictionRepository aiPredictionRepository;

    @Transactional(readOnly = true)
    public BatteryListWrapper getBatteries() {

        List<BatteryListResponse> batteries = batteryRepository.findAll()
                .stream()
                .map(BatteryListResponse::new)
                .toList();

        return new BatteryListWrapper(batteries);
    }

    @Transactional(readOnly = true)
    public BatteryDetailResponse getBattery(String batteryId) {

        Battery battery = batteryRepository.findById(batteryId)
                .orElseThrow(() -> new BatteryNotFoundException(batteryId));

        return new BatteryDetailResponse(battery);
    }

    @Transactional(readOnly = true)
    public BatteryMeasurementWrapper getMeasurements(String batteryId) {

        // 존재하지 않는 배터리인지 먼저 확인
        if (!batteryRepository.existsById(batteryId)) {
            throw new BatteryNotFoundException(batteryId);
        }

        List<BatteryMeasurementResponse> measurements =
                batteryMeasurementRepository
                        .findByBattery_BatteryIdOrderByCycleAsc(batteryId)
                        .stream()
                        .map(BatteryMeasurementResponse::new)
                        .toList();

        return new BatteryMeasurementWrapper(
                batteryId,
                measurements
        );
    }

    @Transactional(readOnly = true)
    public BatteryDegradationWrapper getDegradation(String batteryId) {

        if (!batteryRepository.existsById(batteryId)) {
            throw new BatteryNotFoundException(batteryId);
        }

        List<BatteryDegradationResponse> degradation =
                aiPredictionRepository
                        .findByBattery_BatteryIdOrderByCycleAsc(batteryId)
                        .stream()
                        .map(BatteryDegradationResponse::new)
                        .toList();

        return new BatteryDegradationWrapper(
                batteryId,
                degradation
        );
    }
}