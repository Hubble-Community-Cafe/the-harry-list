package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UpdateReservationService implements Command<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation, com.pimvanleeuwen.the_harry_list_backend.dto.Reservation> {

    private static final Logger log = LoggerFactory.getLogger(UpdateReservationService.class);

    private final ReservationRepository reservationRepository;
    private final ReservationMapper reservationMapper;
    private final AuditService auditService;

    @Autowired(required = false)
    private EmailNotificationService emailService;

    public UpdateReservationService(ReservationRepository reservationRepository,
                                    ReservationMapper reservationMapper,
                                    AuditService auditService) {
        this.reservationRepository = reservationRepository;
        this.reservationMapper = reservationMapper;
        this.auditService = auditService;
    }

    @Override
    public ResponseEntity<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation> execute(com.pimvanleeuwen.the_harry_list_backend.dto.Reservation input) {
        return executeWithEmail(input, true);
    }

    /**
     * Update a reservation with optional email notification.
     * @param input The reservation DTO
     * @param sendEmail Whether to send email notification
     */
    public ResponseEntity<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation> executeWithEmail(
            com.pimvanleeuwen.the_harry_list_backend.dto.Reservation input, boolean sendEmail) {
        if (input.getId() == null) {
            log.error("Cannot update reservation without ID");
            return ResponseEntity.badRequest().build();
        }

        log.info("LOGGING reservation.update.started id={}", input.getId());

        Optional<Reservation> existingReservation = reservationRepository.findById(input.getId());

        if (existingReservation.isEmpty()) {
            log.warn("Reservation with ID {} not found", input.getId());
            return ResponseEntity.notFound().build();
        }

        // Convert DTO to entity, preserving the existing entity's metadata
        Reservation existing = existingReservation.get();
        Reservation entity = reservationMapper.toEntity(input);
        entity.setId(input.getId());

        // Preserve fields that should not be changed via update
        entity.setStatus(existing.getStatus());
        entity.setCreatedAt(existing.getCreatedAt());
        entity.setConfirmationNumber(existing.getConfirmationNumber());
        entity.setConfirmedBy(existing.getConfirmedBy());
        // These are not part of the edit form and must not be wiped on update:
        // - termsAccepted is set by the customer at submission time
        // - cateringArranged is managed via its own dedicated endpoint
        entity.setTermsAccepted(existing.getTermsAccepted());
        entity.setCateringArranged(existing.isCateringArranged());
        // Internal notes can be updated by staff; fall back to existing if not provided
        entity.setInternalNotes(input.getInternalNotes() != null ? input.getInternalNotes() : existing.getInternalNotes());

        // Compute the field-level diff BEFORE saving: persisting merges the new state
        // onto the managed `existing` instance, after which they would compare equal.
        List<FieldChange> diffs = AuditDiff.compare(existing, entity);

        // Save updated entity
        Reservation savedEntity = reservationRepository.save(entity);

        log.info("LOGGING reservation.updated id={} confirmation='{}' event='{}' date={} location={} guests={}",
                savedEntity.getId(), savedEntity.getConfirmationNumber(),
                savedEntity.getEventTitle(), savedEntity.getEventDate(),
                savedEntity.getLocation(), savedEntity.getExpectedGuests());

        auditService.recordUpdate(AuditEntityType.RESERVATION, savedEntity.getId(),
                label(savedEntity), diffs, "Reservation updated");

        // Send email notification if enabled
        if (sendEmail && emailService != null) {
            try {
                emailService.sendReservationUpdatedEmail(savedEntity);
            } catch (Exception e) {
                log.error("Failed to send update email, but reservation was updated successfully", e);
            }
        }

        return ResponseEntity.ok(reservationMapper.toDto(savedEntity));
    }

    private static String label(Reservation r) {
        return r.getConfirmationNumber() + " - " + r.getEventTitle();
    }
}
