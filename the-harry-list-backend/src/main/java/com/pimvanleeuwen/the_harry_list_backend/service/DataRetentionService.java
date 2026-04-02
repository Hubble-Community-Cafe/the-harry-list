package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Automatically removes reservations older than the configured retention period.
 * Retention is configured via DATA_RETENTION_DAYS environment variable.
 * Set to 0 to disable automatic removal.
 */
@Service
public class DataRetentionService {

    private static final Logger log = LoggerFactory.getLogger(DataRetentionService.class);

    private final ReservationRepository reservationRepository;
    private final int retentionDays;

    public DataRetentionService(ReservationRepository reservationRepository,
                                @Value("${app.data.retention.days:365}") int retentionDays) {
        this.reservationRepository = reservationRepository;
        this.retentionDays = retentionDays;
    }

    public int getRetentionDays() {
        return retentionDays;
    }

    public boolean isEnabled() {
        return retentionDays > 0;
    }

    public long countEligibleForDeletion() {
        if (!isEnabled()) return 0;
        return reservationRepository.countByEventDateBefore(cutoffDate());
    }

    /**
     * Runs daily at 02:00 to purge reservations older than the retention period.
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void purgeExpiredReservations() {
        if (!isEnabled()) {
            log.debug("Data retention is disabled (retentionDays=0), skipping purge");
            return;
        }

        LocalDate cutoff = cutoffDate();
        List<Reservation> expired = reservationRepository.findByEventDateBefore(cutoff);

        if (expired.isEmpty()) {
            log.info("Data retention: no reservations older than {} days to purge", retentionDays);
            return;
        }

        reservationRepository.deleteAll(expired);
        log.info("LOGGING data.retention.purge count={} cutoff={} retentionDays={}",
                expired.size(), cutoff, retentionDays);
    }

    private LocalDate cutoffDate() {
        return LocalDate.now().minusDays(retentionDays);
    }
}
