package com.kes.bms.controller;

import com.kes.bms.dto.BatteryListWrapper;
import com.kes.bms.service.BatteryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
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
}