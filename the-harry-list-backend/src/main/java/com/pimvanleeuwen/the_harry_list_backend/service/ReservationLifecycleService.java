package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange;
import com.pimvanleeuwen.the_harry_list_backend.exception.BusinessRuleException;
import com.pimvanleeuwen.the_harry_list_backend.exception.NotFoundException;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditAction;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Staff actions on an existing reservation that are not a full edit: changing its status,
 * marking catering as arranged and updating the internal notes. Each action saves the
 * reservation, then writes the audit entry and, where relevant, the analytics line and email.
 */
@Service
public class ReservationLifecycleService {

    private static final Logger log = LoggerFactory.getLogger(ReservationLifecycleService.class);
    /** Dedicated, PII-free analytics logger scraped into Loki (job=app-analytics). */
    private static final Logger analyticsLog = LoggerFactory.getLogger("analytics");
    /** Same limit as the internal_notes column validation on the entity. */
    private static final int MAX_INTERNAL_NOTES = 5000;

    private final ReservationRepository reservationRepository;
    private final ReservationMapper reservationMapper;
    private final AuditService auditService;

    @Autowired(required = false)
    private EmailNotificationService emailService;

    public ReservationLifecycleService(ReservationRepository reservationRepository,
                                       ReservationMapper reservationMapper,
                                       AuditService auditService) {
        this.reservationRepository = reservationRepository;
        this.reservationMapper = reservationMapper;
        this.auditService = auditService;
    }

    /**
     * Move a reservation to a new status.
     * @param confirmedBy staff name stored on the reservation when confirming; may be null
     * @param sendEmail whether to email the requester about the change
     * @param customMessage optional note added to that email; may be null/blank
     * @param actor the signed-in staff member, for the log line
     * @throws NotFoundException when no reservation has this id
     * @throws BusinessRuleException when the change is not allowed from the current status
     *         (see {@link ReservationStatus#canMoveTo}) or confirms a reservation without a location
     */
    @Transactional
    public com.pimvanleeuwen.the_harry_list_backend.dto.Reservation changeStatus(
            Long id, ReservationStatus status, String confirmedBy,
            boolean sendEmail, String customMessage, String actor) {
        Reservation reservation = find(id);

        if (reservation.getStatus() != null && !reservation.getStatus().canMoveTo(status)) {
            throw new BusinessRuleException("A " + reservation.getStatus().name().toLowerCase()
                    + " reservation cannot be moved to " + status.name().toLowerCase());
        }

        if (status == ReservationStatus.CONFIRMED
                && (reservation.getLocation() == null || reservation.getLocation() == BarLocation.NO_PREFERENCE)) {
            throw new BusinessRuleException("Location must be set before confirming");
        }

        ReservationStatus oldStatus = reservation.getStatus();
        reservation.setStatus(status);
        if (confirmedBy != null && status == ReservationStatus.CONFIRMED) {
            reservation.setConfirmedBy(confirmedBy);
        }
        Reservation saved = reservationRepository.saveAndFlush(reservation);

        // Privacy-safe analytics: a coarse note that a status transition happened, for
        // the terminal/meaningful states only (PENDING re-opens are internal churn).
        if (status != ReservationStatus.PENDING) {
            AfterCommit.run(() -> analyticsLog.info(ReservationAnalytics.reservationStatusChangedLine(status, saved.getLocation())));
        }

        log.info("AUDIT reservation.status_changed id={} confirmation='{}' event='{}' date={} status={}->{} user='{}'{}",
                id, saved.getConfirmationNumber(), LogSafe.text(saved.getEventTitle()), saved.getEventDate(),
                oldStatus, status, actor,
                confirmedBy != null ? " confirmedBy='" + LogSafe.text(confirmedBy) + "'" : "");

        // The message content itself is not stored in the audit log (may be long); we only
        // record that a custom message accompanied the status change.
        boolean hasCustomMessage = customMessage != null && !customMessage.isBlank();
        auditService.recordAction(AuditEntityType.RESERVATION, id, label(saved),
                AuditAction.STATUS_CHANGE,
                List.of(new FieldChange("status", String.valueOf(oldStatus), String.valueOf(status))),
                "Status changed"
                        + (confirmedBy != null ? " (confirmed by " + confirmedBy + ")" : "")
                        + (hasCustomMessage ? " (with message)" : ""));

        if (sendEmail && emailService != null) {
            AfterCommit.run(() -> emailService.sendStatusChangeEmail(saved, customMessage));
        }

        return reservationMapper.toDto(saved);
    }

    /**
     * Mark catering as arranged, or undo that.
     * @throws NotFoundException when no reservation has this id
     */
    @Transactional
    public com.pimvanleeuwen.the_harry_list_backend.dto.Reservation setCateringArranged(
            Long id, boolean arranged, String actor) {
        log.info("AUDIT reservation.catering_arranged id={} arranged={} user='{}'", id, arranged, actor);

        Reservation reservation = find(id);
        boolean previous = reservation.isCateringArranged();
        reservation.setCateringArranged(arranged);
        Reservation saved = reservationRepository.saveAndFlush(reservation);

        auditService.recordAction(AuditEntityType.RESERVATION, id, label(saved),
                AuditAction.CATERING_ARRANGED,
                List.of(new FieldChange("cateringArranged", String.valueOf(previous), String.valueOf(arranged))),
                arranged ? "Catering marked as arranged" : "Catering arranged unset");

        return reservationMapper.toDto(saved);
    }

    /**
     * Replace the staff-only internal notes.
     * @throws NotFoundException when no reservation has this id
     */
    @Transactional
    public com.pimvanleeuwen.the_harry_list_backend.dto.Reservation updateInternalNotes(
            Long id, String notes, String actor) {
        log.info("AUDIT reservation.notes_updated id={} user='{}'", id, actor);

        if (notes != null && notes.length() > MAX_INTERNAL_NOTES) {
            throw new BusinessRuleException("Internal notes must not exceed " + MAX_INTERNAL_NOTES + " characters");
        }

        Reservation reservation = find(id);
        reservation.setInternalNotes(notes);
        Reservation saved = reservationRepository.saveAndFlush(reservation);

        // Note content is intentionally not stored in the audit log (may be long/sensitive).
        auditService.recordAction(AuditEntityType.RESERVATION, id, label(saved),
                AuditAction.NOTES_UPDATED, List.of(), "Internal notes updated");

        return reservationMapper.toDto(saved);
    }

    private Reservation find(Long id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Reservation", id));
    }

    private static String label(Reservation r) {
        return r.getConfirmationNumber() + " - " + r.getEventTitle();
    }
}
