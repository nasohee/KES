package com.kes.bms.service;

import com.kes.bms.dto.response.BmsDataResponse;
import com.kes.bms.dto.response.BmsStatusResponse;
import com.kes.bms.dto.wrapper.BmsDataWrapper;
import com.kes.bms.entity.BmsData;
import com.kes.bms.exception.BmsDataNotFoundException;
import com.kes.bms.repository.BmsDataRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BmsService {

    private final BmsDataRepository bmsDataRepository;

    @Transactional(readOnly = true)
    public BmsDataWrapper getBmsData() {

        List<BmsDataResponse> data = bmsDataRepository
                .findAllByOrderByTimeSecAsc()
                .stream()
                .map(BmsDataResponse::new)
                .toList();

        return new BmsDataWrapper(data);
    }

    @Transactional(readOnly = true)
    public BmsStatusResponse getBmsStatus() {

        BmsData latestData = bmsDataRepository
                .findTopByOrderByTimeSecDesc()
                .orElseThrow(BmsDataNotFoundException::new);

        return new BmsStatusResponse(latestData);
    }
}