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
import org.springframework.transaction.annotation.Transactional;

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
    @Transactional
    public com.pimvanleeuwen.the_harry_list_backend.dto.Reservation update(com.pimvanleeuwen.the_harry_list_backend.dto.Reservation input, boolean sendEmail, String customMessage) {
        if (input.getId() == null) {
            throw new BusinessRuleException("Reservation id is required");
        }

        log.info("LOGGING reservation.update.started id={}", input.getId());

        Reservation existing = reservationRepository.findById(input.getId())
                .orElseThrow(() -> NotFoundException.of("Reservation", input.getId()));

        // Edit the stored record in place: the mapper copies only the editable fields, so
        // status, confirmation number, terms and any field added later are never wiped.
        // The audit diff compares a snapshot taken before the edit with the result.
        com.pimvanleeuwen.the_harry_list_backend.dto.Reservation before = reservationMapper.toDto(existing);
        reservationMapper.applyEditableFields(input, existing);
        Reservation savedEntity = reservationRepository.saveAndFlush(existing);
        List<FieldChange> diffs = AuditDiff.compare(before, reservationMapper.toDto(savedEntity));

        log.info("LOGGING reservation.updated id={} confirmation='{}' event='{}' date={} location={} guests={}",
                savedEntity.getId(), savedEntity.getConfirmationNumber(),
                LogSafe.text(savedEntity.getEventTitle()), savedEntity.getEventDate(),
                savedEntity.getLocation(), savedEntity.getExpectedGuests());

        auditService.recordUpdate(AuditEntityType.RESERVATION, savedEntity.getId(),
                label(savedEntity), diffs, "Reservation updated");

        if (sendEmail && emailService != null) {
            AfterCommit.run(() -> emailService.sendReservationUpdatedEmail(savedEntity, customMessage));
        }

        return reservationMapper.toDto(savedEntity);
    }

    private static String label(Reservation r) {
        return r.getConfirmationNumber() + " - " + r.getEventTitle();
    }
}
