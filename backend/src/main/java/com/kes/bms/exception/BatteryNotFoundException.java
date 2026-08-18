package com.kes.bms.exception;

public class BatteryNotFoundException extends RuntimeException {

    public BatteryNotFoundException(String batteryId) {
        super("Battery not found: " + batteryId);
    }
}