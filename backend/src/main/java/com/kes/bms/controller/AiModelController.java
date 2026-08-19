package com.kes.bms.controller;

import com.kes.bms.dto.response.AiModelResponse;
import com.kes.bms.service.AiModelService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/models")
public class AiModelController {

    private final AiModelService aiModelService;

    @GetMapping
    public ResponseEntity<AiModelResponse> getLatestModel() {
        return ResponseEntity.ok(
                aiModelService.getLatestModel()
        );
    }
}