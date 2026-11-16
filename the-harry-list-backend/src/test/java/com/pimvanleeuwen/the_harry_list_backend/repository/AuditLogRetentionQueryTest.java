package com.pimvanleeuwen.the_harry_list_backend.repository;

import com.pimvanleeuwen.the_harry_list_backend.model.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Runs the audit retention deletes against a real (H2) database: a typo in the JPQL, or the
 * NULL handling of entity ids, would otherwise only show up in production at 02:00.
 */
@SpringBootTest
@Transactional
class AuditLogRetentionQueryTest {

    private static final LocalDateTime OLD = LocalDateTime.now().minusDays(500);
    private static final LocalDateTime RECENT = LocalDateTime.now().minusDays(10);
    private static final LocalDateTime CUTOFF = LocalDateTime.now().minusDays(457);

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Test
    void oldEntriesGoUnlessTheyBelongToAReservationThatStillExists() {
        Reservation live = reservationRepository.save(reservation());
        long liveHistory = entry(AuditEntityType.RESERVATION, live.getId(), OLD);
        long deletedReservation = entry(AuditEntityType.RESERVATION, 999_999L, OLD);
        long oldSetting = entry(AuditEntityType.BLOCKED_PERIOD, 5L, OLD);
        long noEntityId = entry(AuditEntityType.RESERVATION, null, OLD);
        long recentSetting = entry(AuditEntityType.BLOCKED_PERIOD, 6L, RECENT);

        int removed = auditLogRepository.deleteOlderThanExceptLiveReservations(CUTOFF, AuditEntityType.RESERVATION);

        assertEquals(3, removed);
        assertEquals(List.of(liveHistory, recentSetting), remainingIds());
        assertEquals(List.of(), List.of(deletedReservation, oldSetting, noEntityId).stream()
                .filter(id -> auditLogRepository.existsById(id)).toList());
    }

    @Test
    void theHistoryOfPurgedReservationsGoesRegardlessOfAge() {
        long first = entry(AuditEntityType.RESERVATION, 1L, RECENT);
        long second = entry(AuditEntityType.RESERVATION, 2L, OLD);
        long other = entry(AuditEntityType.RESERVATION, 3L, RECENT);
        long sameIdOtherType = entry(AuditEntityType.BLOCKED_PERIOD, 1L, RECENT);

        int removed = auditLogRepository.deleteHistoryOf(AuditEntityType.RESERVATION, List.of(1L, 2L));

        assertEquals(2, removed);
        assertEquals(List.of(other, sameIdOtherType), remainingIds());
        assertEquals(List.of(), List.of(first, second).stream().filter(auditLogRepository::existsById).toList());
    }

    private List<Long> remainingIds() {
        return auditLogRepository.findAll().stream().map(AuditLog::getId).sorted().toList();
    }

    private long entry(AuditEntityType type, Long entityId, LocalDateTime createdAt) {
        AuditLog log = new AuditLog();
        log.setEntityType(type);
        log.setEntityId(entityId);
        log.setAction(AuditAction.UPDATE);
        log.setCreatedAt(createdAt);
        return auditLogRepository.saveAndFlush(log).getId();
    }

    private static Reservation reservation() {
        Reservation r = new Reservation();
        r.setContactName("Guest");
        r.setEmail("guest@example.com");
        r.setEventTitle("Event");
        r.setDescription("Description");
        r.setEventDate(LocalDate.now().plusDays(30));
        r.setStartTime(LocalTime.of(18, 0));
        r.setEndTime(LocalTime.of(20, 0));
        r.setSeatingArea(SeatingArea.INSIDE);
        r.setPaymentOption(PaymentOption.INDIVIDUAL);
        return r;
    }
}
