package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.exception.NotFoundException;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class DeleteReservationService {

    private static final Logger log = LoggerFactory.getLogger(DeleteReservationService.class);

    private final ReservationRepository reservationRepository;
    private final AuditService auditService;

    @Autowired(required = false)
    private EmailNotificationService emailService;

    public DeleteReservationService(ReservationRepository reservationRepository, AuditService auditService) {
        this.reservationRepository = reservationRepository;
        this.auditService = auditService;
    }

    /**
     * Delete a reservation with optional email notification.
     * @param id The reservation ID
     * @param sendEmail Whether to send email notification
     * @throws NotFoundException when no reservation has this id
     */
    public void delete(Long id, boolean sendEmail) {
        log.info("LOGGING reservation.cancel.started id={}", id);

        Reservation r = reservationRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Reservation", id));

        // Send email notification before deleting if enabled
        if (sendEmail && emailService != null) {
            try {
                emailService.sendReservationCancelledEmail(r);
            } catch (Exception e) {
                log.error("Failed to send cancellation email, but proceeding with deletion", e);
            }
        }

        // No contact name or email: these logs are centralized (Loki), so guest PII must not be written.
        log.info("LOGGING reservation.cancelled id={} confirmation='{}' event='{}' date={}",
                id, r.getConfirmationNumber(), r.getEventTitle(), r.getEventDate());

        reservationRepository.deleteById(id);

        auditService.recordDelete(AuditEntityType.RESERVATION, id,
                r.getConfirmationNumber() + " - " + r.getEventTitle(),
                "Reservation deleted (contact: " + r.getContactName() + ")");
    }
}
