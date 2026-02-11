package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class DeleteReservationService implements Command<Long, Void> {

    private static final Logger log = LoggerFactory.getLogger(DeleteReservationService.class);

    private final ReservationRepository reservationRepository;

    @Autowired(required = false)
    private EmailNotificationService emailService;

    public DeleteReservationService(ReservationRepository reservationRepository) {
        this.reservationRepository = reservationRepository;
    }

    @Override
    public ResponseEntity<Void> execute(Long id) {
        return executeWithEmail(id, true);
    }

    /**
     * Delete a reservation with optional email notification.
     * @param id The reservation ID
     * @param sendEmail Whether to send email notification
     */
    public ResponseEntity<Void> executeWithEmail(Long id, boolean sendEmail) {
        log.info("Deleting reservation with ID: {}", id);

        Optional<Reservation> reservation = reservationRepository.findById(id);

        if (reservation.isEmpty()) {
            log.warn("Reservation with ID {} not found", id);
            return ResponseEntity.notFound().build();
        }

        // Send email notification before deleting if enabled
        if (sendEmail && emailService != null) {
            try {
                emailService.sendReservationCancelledEmail(reservation.get());
            } catch (Exception e) {
                log.error("Failed to send cancellation email, but proceeding with deletion", e);
            }
        }

        reservationRepository.deleteById(id);

        log.info("Deleted reservation with ID: {}", id);

        return ResponseEntity.noContent().build();
    }
}
