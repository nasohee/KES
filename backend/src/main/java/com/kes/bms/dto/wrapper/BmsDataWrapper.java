package com.kes.bms.dto.wrapper;

import com.kes.bms.dto.response.BmsDataResponse;
import lombok.Getter;

import java.util.List;

@Getter

public class BmsDataWrapper {

    private final List<BmsDataResponse> bmsData;

    public BmsDataWrapper(List<BmsDataResponse> bmsData) {

        this.bmsData = bmsData;

    }

}