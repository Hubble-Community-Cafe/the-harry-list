package com.pimvanleeuwen.the_harry_list_backend.repository;

import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.BlockedPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface BlockedPeriodRepository extends JpaRepository<BlockedPeriod, Long> {
    List<BlockedPeriod> findByEnabledTrue();

    /** Find active blocked periods that overlap with a given date and optional location. */
    @Query("SELECT bp FROM BlockedPeriod bp WHERE bp.enabled = true " +
           "AND bp.startDate <= :date AND bp.endDate >= :date " +
           "AND (bp.location IS NULL OR bp.location = :location)")
    List<BlockedPeriod> findBlockingPeriods(@Param("date") LocalDate date,
                                            @Param("location") BarLocation location);
}
