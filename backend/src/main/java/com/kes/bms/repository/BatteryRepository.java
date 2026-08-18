package com.kes.bms.repository;

import com.kes.bms.entity.Battery;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BatteryRepository extends JpaRepository<Battery, String> {
}