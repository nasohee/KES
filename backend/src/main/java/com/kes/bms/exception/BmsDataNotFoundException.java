package com.kes.bms.exception;

public class BmsDataNotFoundException extends RuntimeException {

    public BmsDataNotFoundException() {
        super("BMS data not found");
    }
}