package com.kes.bms.repository;

import com.kes.bms.entity.BmsData;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BmsDataRepository extends JpaRepository<BmsData, Long> {

    List<BmsData> findAllByOrderByTimeSecAsc();

    Optional<BmsData> findTopByOrderByTimeSecDesc();
}