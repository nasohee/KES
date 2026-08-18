package com.kes.bms.controller;

import com.kes.bms.dto.response.BmsStatusResponse;
import com.kes.bms.dto.wrapper.BmsDataWrapper;
import com.kes.bms.service.BmsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/bms")
public class BmsController {

    private final BmsService bmsService;

    @GetMapping("/data")
    public ResponseEntity<BmsDataWrapper> getBmsData() {
        return ResponseEntity.ok(bmsService.getBmsData());
    }

    @GetMapping("/status")
    public ResponseEntity<BmsStatusResponse> getBmsStatus() {
        return ResponseEntity.ok(
                bmsService.getBmsStatus()
        );
    }
}