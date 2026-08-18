package com.kes.bms.service;

import com.kes.bms.dto.BatteryListResponse;
import com.kes.bms.dto.BatteryListWrapper;
import com.kes.bms.repository.BatteryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BatteryService {

    private final BatteryRepository batteryRepository;

    @Transactional(readOnly = true)
    public BatteryListWrapper getBatteries() {

        List<BatteryListResponse> batteries = batteryRepository.findAll()
                .stream()
                .map(BatteryListResponse::new)
                .toList();

        return new BatteryListWrapper(batteries);
    }
}