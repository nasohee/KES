package com.kes.bms.repository;

import com.kes.bms.entity.BatteryMeasurement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BatteryMeasurementRepository
        extends JpaRepository<BatteryMeasurement, Long> {


    //id의 measurement을 찾아 cycle 오름차순 조회
    List<BatteryMeasurement> findByBattery_BatteryIdOrderByCycleAsc(
            String batteryId
    );
}