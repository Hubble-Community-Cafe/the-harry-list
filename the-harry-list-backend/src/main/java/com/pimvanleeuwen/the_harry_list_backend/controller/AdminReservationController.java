package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.dto.CateringEmailRequest;
import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailAttachment;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailTemplateType;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.repository.EmailAttachmentRepository;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailNotificationService;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailTemplateService;
import com.pimvanleeuwen.the_harry_list_backend.service.ReservationMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
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
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final ReservationRepository reservationRepository;
    private final ReservationMapper reservationMapper;
    private final EmailTemplateService emailTemplateService;
    private final EmailAttachmentRepository emailAttachmentRepository;
    private final String barName;
    private final String staffEmail;

    @Autowired(required = false)
    private EmailNotificationService emailService;

    public AdminReservationController(ReservationRepository reservationRepository,
                                      ReservationMapper reservationMapper,
                                      EmailTemplateService emailTemplateService,
                                      EmailAttachmentRepository emailAttachmentRepository,
                                      @Value("${app.bar.name:Hubble and Meteor Community Cafes}") String barName,
                                      @Value("${app.mail.staff:events@hubble.cafe}") String staffEmail) {
        this.reservationRepository = reservationRepository;
        this.reservationMapper = reservationMapper;
        this.emailTemplateService = emailTemplateService;
        this.emailAttachmentRepository = emailAttachmentRepository;
        this.barName = barName;
        this.staffEmail = staffEmail;
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update reservation status", description = "Update the status of a reservation (confirm, reject, cancel)")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestParam ReservationStatus status,
            @RequestParam(required = false) String confirmedBy,
            @RequestParam(required = false, defaultValue = "true") boolean sendEmail,
            Principal principal) {

        return reservationRepository.findById(id)
                .map(reservation -> {
                    // Block confirm when location is NO_PREFERENCE
                    if (status == ReservationStatus.CONFIRMED
                            && (reservation.getLocation() == null || reservation.getLocation() == BarLocation.NO_PREFERENCE)) {
                        return ResponseEntity.badRequest()
                                .body(Map.of("message", "Location must be set before confirming"));
                    }

                    ReservationStatus oldStatus = reservation.getStatus();
                    reservation.setStatus(status);
                    if (confirmedBy != null && status == ReservationStatus.CONFIRMED) {
                        reservation.setConfirmedBy(confirmedBy);
                    }
                    com.pimvanleeuwen.the_harry_list_backend.model.Reservation saved = reservationRepository.save(reservation);

                    log.info("AUDIT reservation.status_changed id={} confirmation='{}' event='{}' date={} status={}->{} user='{}'{}",
                            id, saved.getConfirmationNumber(), saved.getEventTitle(), saved.getEventDate(),
                            oldStatus, status, principal != null ? principal.getName() : "unknown",
                            confirmedBy != null ? " confirmedBy='" + confirmedBy + "'" : "");

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

    @PatchMapping("/{id}/catering-arranged")
    @Operation(summary = "Toggle catering arranged", description = "Mark catering as arranged (or undo) for a reservation")
    public ResponseEntity<Reservation> updateCateringArranged(
            @PathVariable Long id,
            @RequestParam boolean arranged,
            Principal principal) {

        log.info("AUDIT reservation.catering_arranged id={} arranged={} user='{}'",
                id, arranged, principal != null ? principal.getName() : "unknown");

        return reservationRepository.findById(id)
                .map(reservation -> {
                    reservation.setCateringArranged(arranged);
                    com.pimvanleeuwen.the_harry_list_backend.model.Reservation saved = reservationRepository.save(reservation);
                    return ResponseEntity.ok(reservationMapper.toDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/notes")
    @Operation(summary = "Update internal notes", description = "Add or update internal notes for a reservation")
    public ResponseEntity<Reservation> updateInternalNotes(
            @PathVariable Long id,
            @RequestBody String notes,
            Principal principal) {

        log.info("AUDIT reservation.notes_updated id={} user='{}'",
                id, principal != null ? principal.getName() : "unknown");

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
            @RequestBody Map<String, String> emailRequest,
            Principal principal) {

        String subject = emailRequest.get("subject");
        String message = emailRequest.get("message");

        log.info("AUDIT email.custom_sent id={} subject='{}' user='{}'",
                id, subject, principal != null ? principal.getName() : "unknown");

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

    @GetMapping("/{id}/catering-email/preview")
    @Operation(summary = "Preview catering email", description = "Get rendered catering email template for a reservation")
    public ResponseEntity<?> previewCateringEmail(@PathVariable Long id) {
        return reservationRepository.findById(id)
                .map(reservation -> {
                    Map<String, String> vars = buildCateringVars(reservation);
                    String subject = emailTemplateService.getRenderedSubject(EmailTemplateType.CATERING_OPTIONS, vars);
                    String body = emailTemplateService.getRenderedBody(EmailTemplateType.CATERING_OPTIONS, vars);
                    return ResponseEntity.ok(Map.of("subject", subject, "body", body));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/catering-email")
    @Operation(summary = "Send catering options email", description = "Send catering email with PDF attachments to reservation contact")
    public ResponseEntity<Map<String, String>> sendCateringEmail(
            @PathVariable Long id,
            @RequestBody CateringEmailRequest request,
            Principal principal) {

        log.info("AUDIT email.catering_sent id={} user='{}'",
                id, principal != null ? principal.getName() : "unknown");

        return reservationRepository.findById(id)
                .map(reservation -> {
                    if (emailService == null) {
                        return ResponseEntity.ok(Map.of("status", "disabled", "message", "Email service is disabled"));
                    }

                    try {
                        // Render subject/body from template or use overrides
                        Map<String, String> vars = buildCateringVars(reservation);
                        String subject = (request.getSubject() != null && !request.getSubject().isBlank())
                                ? request.getSubject()
                                : emailTemplateService.getRenderedSubject(EmailTemplateType.CATERING_OPTIONS, vars);
                        String body = (request.getBody() != null && !request.getBody().isBlank())
                                ? request.getBody()
                                : emailTemplateService.getRenderedBody(EmailTemplateType.CATERING_OPTIONS, vars);

                        // Load attachments
                        List<EmailAttachment> attachments = List.of();
                        if (request.getAttachmentIds() != null && !request.getAttachmentIds().isEmpty()) {
                            attachments = emailAttachmentRepository.findAllById(request.getAttachmentIds());
                        }

                        emailService.sendEmailWithAttachments(
                                reservation.getEmail(), subject, body, attachments, request.getReplyTo());

                        log.info("AUDIT email.catering_delivered confirmation='{}' to='{}' attachments={} user='{}'",
                                reservation.getConfirmationNumber(), reservation.getEmail(), attachments.size(),
                                principal != null ? principal.getName() : "unknown");

                        return ResponseEntity.ok(Map.of("status", "sent", "message", "Catering email sent successfully"));
                    } catch (Exception e) {
                        log.error("Failed to send catering email", e);
                        return ResponseEntity.internalServerError()
                                .body(Map.of("status", "error", "message", "Failed to send email: " + e.getMessage()));
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private Map<String, String> buildCateringVars(com.pimvanleeuwen.the_harry_list_backend.model.Reservation reservation) {
        Map<String, String> vars = new HashMap<>();
        vars.put("contactName", reservation.getContactName());
        vars.put("confirmationNumber", reservation.getConfirmationNumber());
        vars.put("eventTitle", reservation.getEventTitle());
        vars.put("eventDate", reservation.getEventDate().format(DATE_FORMATTER));
        vars.put("startTime", reservation.getStartTime().format(TIME_FORMATTER));
        vars.put("endTime", reservation.getEndTime().format(TIME_FORMATTER));
        vars.put("location", reservation.getLocation() != null ? reservation.getLocation().getDisplayName() : "No Preference");
        vars.put("expectedGuests", String.valueOf(reservation.getExpectedGuests()));
        vars.put("barName", barName);
        vars.put("staffEmail", staffEmail);
        return vars;
    }
}
