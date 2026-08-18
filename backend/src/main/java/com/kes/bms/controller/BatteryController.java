package com.kes.bms.controller;

import com.kes.bms.dto.response.BatteryDetailResponse;
import com.kes.bms.dto.wrapper.BatteryDegradationWrapper;
import com.kes.bms.dto.wrapper.BatteryListWrapper;
import com.kes.bms.dto.wrapper.BatteryMeasurementWrapper;
import com.kes.bms.service.BatteryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/batteries")
public class BatteryController {

    private final BatteryService batteryService;

    @GetMapping
    public ResponseEntity<BatteryListWrapper> getBatteries() {
        return ResponseEntity.ok(batteryService.getBatteries());
    }

    @GetMapping("/{batteryId}")
    public ResponseEntity<BatteryDetailResponse> getBattery(
            @PathVariable String batteryId
    ) {
        return ResponseEntity.ok(batteryService.getBattery(batteryId));
    }

    @GetMapping("/{batteryId}/measurements")
    public ResponseEntity<BatteryMeasurementWrapper> getMeasurements(
            @PathVariable String batteryId
    ) {
        return ResponseEntity.ok(
                batteryService.getMeasurements(batteryId)
        );
    }

    @GetMapping("/{batteryId}/degradation")
    public ResponseEntity<BatteryDegradationWrapper> getDegradation(
            @PathVariable String batteryId
    ) {
        return ResponseEntity.ok(
                batteryService.getDegradation(batteryId)
        );
    }
}