package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange;
import com.pimvanleeuwen.the_harry_list_backend.exception.BusinessRuleException;
import com.pimvanleeuwen.the_harry_list_backend.exception.NotFoundException;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UpdateReservationService {

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

    /**
     * Update a reservation with optional email notification and an optional custom message.
     * Staff edits deliberately skip the public form's rules (constraints, blocked periods,
     * retired activities), so staff can make exceptions agreed with the guest; only new
     * submissions are checked, in {@link CreateReservationService}.
     * @param input The reservation DTO
     * @param sendEmail Whether to send email notification
     * @param customMessage Optional free-text note added to the update email; may be null/blank to omit.
     * @return the saved reservation
     * @throws NotFoundException when no reservation has the input's id
     */
    public com.pimvanleeuwen.the_harry_list_backend.dto.Reservation update(com.pimvanleeuwen.the_harry_list_backend.dto.Reservation input, boolean sendEmail, String customMessage) {
        if (input.getId() == null) {
            throw new BusinessRuleException("Reservation id is required");
        }

        log.info("LOGGING reservation.update.started id={}", input.getId());

        Reservation existing = reservationRepository.findById(input.getId())
                .orElseThrow(() -> NotFoundException.of("Reservation", input.getId()));

        // Convert DTO to entity, preserving the existing entity's metadata
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
                emailService.sendReservationUpdatedEmail(savedEntity, customMessage);
            } catch (Exception e) {
                log.error("Failed to send update email, but reservation was updated successfully", e);
            }
        }

        return reservationMapper.toDto(savedEntity);
    }

    private static String label(Reservation r) {
        return r.getConfirmationNumber() + " - " + r.getEventTitle();
    }
}
