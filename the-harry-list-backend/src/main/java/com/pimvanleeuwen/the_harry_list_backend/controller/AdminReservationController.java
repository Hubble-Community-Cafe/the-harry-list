package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailNotificationService;
import com.pimvanleeuwen.the_harry_list_backend.service.ReservationMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin controller for reservation management.
 * These endpoints require authentication.
 */
@RestController
@RequestMapping("/api/admin/reservations")
@Tag(name = "Admin - Reservations", description = "Admin endpoints for managing reservations (login required)")
@SecurityRequirement(name = "basicAuth")
public class AdminReservationController {

    private static final Logger log = LoggerFactory.getLogger(AdminReservationController.class);

    private final ReservationRepository reservationRepository;
    private final ReservationMapper reservationMapper;

    @Autowired(required = false)
    private EmailNotificationService emailService;

    public AdminReservationController(ReservationRepository reservationRepository, ReservationMapper reservationMapper) {
        this.reservationRepository = reservationRepository;
        this.reservationMapper = reservationMapper;
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update reservation status", description = "Update the status of a reservation (confirm, reject, cancel)")
    public ResponseEntity<Reservation> updateStatus(
            @PathVariable Long id,
            @RequestParam ReservationStatus status,
            @RequestParam(required = false) String confirmedBy,
            @RequestParam(required = false, defaultValue = "true") boolean sendEmail) {

        log.info("Updating reservation {} status to {} (sendEmail: {})", id, status, sendEmail);

        return reservationRepository.findById(id)
                .map(reservation -> {
                    ReservationStatus oldStatus = reservation.getStatus();
                    reservation.setStatus(status);
                    if (confirmedBy != null && status == ReservationStatus.CONFIRMED) {
                        reservation.setConfirmedBy(confirmedBy);
                    }
                    com.pimvanleeuwen.the_harry_list_backend.model.Reservation saved = reservationRepository.save(reservation);

                    // Send email notification if enabled
                    if (sendEmail && emailService != null) {
                        try {
                            emailService.sendStatusChangeEmail(saved, oldStatus, confirmedBy);
                        } catch (Exception e) {
                            log.error("Failed to send status change email, but status was updated successfully", e);
                        }
                    }

                    return ResponseEntity.ok(reservationMapper.toDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/notes")
    @Operation(summary = "Update internal notes", description = "Add or update internal notes for a reservation")
    public ResponseEntity<Reservation> updateInternalNotes(
            @PathVariable Long id,
            @RequestBody String notes) {

        log.info("Updating internal notes for reservation {}", id);

        return reservationRepository.findById(id)
                .map(reservation -> {
                    reservation.setInternalNotes(notes);
                    com.pimvanleeuwen.the_harry_list_backend.model.Reservation saved = reservationRepository.save(reservation);
                    return ResponseEntity.ok(reservationMapper.toDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/email")
    @Operation(summary = "Send custom email", description = "Send a custom email to the reservation contact")
    public ResponseEntity<Map<String, String>> sendCustomEmail(
            @PathVariable Long id,
            @RequestBody Map<String, String> emailRequest) {

        String subject = emailRequest.get("subject");
        String message = emailRequest.get("message");

        log.info("Sending custom email for reservation {} with subject: {}", id, subject);

        return reservationRepository.findById(id)
                .map(reservation -> {
                    if (emailService != null) {
                        try {
                            emailService.sendCustomEmail(reservation, subject, message);
                            return ResponseEntity.ok(Map.of("status", "sent", "message", "Email sent successfully"));
                        } catch (Exception e) {
                            log.error("Failed to send custom email", e);
                            return ResponseEntity.internalServerError()
                                    .body(Map.of("status", "error", "message", "Failed to send email: " + e.getMessage()));
                        }
                    } else {
                        return ResponseEntity.ok(Map.of("status", "disabled", "message", "Email service is disabled"));
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }
}

