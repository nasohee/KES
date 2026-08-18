package com.kes.bms.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class BatteryListWrapper {

    private final List<BatteryListResponse> batteries;

    public BatteryListWrapper(List<BatteryListResponse> batteries) {
        this.batteries = batteries;
    }
}