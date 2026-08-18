package com.kes.bms.dto.wrapper;

import com.kes.bms.dto.response.BatteryListResponse;
import lombok.Getter;

import java.util.List;

@Getter
public class BatteryListWrapper {

    private final List<BatteryListResponse> batteries;

    public BatteryListWrapper(List<BatteryListResponse> batteries) {
        this.batteries = batteries;
    }
}