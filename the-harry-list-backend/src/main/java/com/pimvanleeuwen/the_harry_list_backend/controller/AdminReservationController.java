package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.exception.NotFoundException;
import com.pimvanleeuwen.the_harry_list_backend.dto.CateringEmailRequest;
import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditAction;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailAttachment;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailTemplateType;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.repository.EmailAttachmentRepository;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import com.pimvanleeuwen.the_harry_list_backend.service.AuditService;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailNotificationService;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailTemplateService;
import com.pimvanleeuwen.the_harry_list_backend.service.ReservationLifecycleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
public class AdminReservationController {

    private static final Logger log = LoggerFactory.getLogger(AdminReservationController.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final ReservationRepository reservationRepository;
    private final ReservationLifecycleService lifecycleService;
    private final EmailTemplateService emailTemplateService;
    private final EmailAttachmentRepository emailAttachmentRepository;
    private final AuditService auditService;
    private final String barName;
    private final String staffEmail;

    @Autowired(required = false)
    private EmailNotificationService emailService;

    public AdminReservationController(ReservationRepository reservationRepository,
                                      ReservationLifecycleService lifecycleService,
                                      EmailTemplateService emailTemplateService,
                                      EmailAttachmentRepository emailAttachmentRepository,
                                      AuditService auditService,
                                      @Value("${app.bar.name:Hubble and Meteor Community Cafes}") String barName,
                                      @Value("${app.mail.staff}") String staffEmail) {
        this.reservationRepository = reservationRepository;
        this.lifecycleService = lifecycleService;
        this.emailTemplateService = emailTemplateService;
        this.emailAttachmentRepository = emailAttachmentRepository;
        this.auditService = auditService;
        this.barName = barName;
        this.staffEmail = staffEmail;
    }

    private static String label(com.pimvanleeuwen.the_harry_list_backend.model.Reservation r) {
        return r.getConfirmationNumber() + " - " + r.getEventTitle();
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Update reservation status", description = "Update the status of a reservation (confirm, reject, cancel)")
    public Reservation updateStatus(
            @PathVariable Long id,
            @RequestParam ReservationStatus status,
            @RequestParam(required = false) String confirmedBy,
            @RequestParam(required = false, defaultValue = "true") boolean sendEmail,
            @RequestParam(required = false) String customMessage,
            Principal principal) {
        return lifecycleService.changeStatus(id, status, confirmedBy, sendEmail, customMessage, actor(principal));
    }

    @PatchMapping("/{id}/catering-arranged")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Toggle catering arranged", description = "Mark catering as arranged (or undo) for a reservation")
    public Reservation updateCateringArranged(
            @PathVariable Long id,
            @RequestParam boolean arranged,
            Principal principal) {
        return lifecycleService.setCateringArranged(id, arranged, actor(principal));
    }

    @PatchMapping("/{id}/notes")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Update internal notes", description = "Add or update internal notes for a reservation")
    public Reservation updateInternalNotes(
            @PathVariable Long id,
            @RequestBody String notes,
            Principal principal) {
        return lifecycleService.updateInternalNotes(id, notes, actor(principal));
    }

    private static String actor(Principal principal) {
        return principal != null ? principal.getName() : "unknown";
    }

    @PostMapping("/{id}/email")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Send custom email", description = "Send a custom email to the reservation contact")
    public ResponseEntity<?> sendCustomEmail(
            @PathVariable Long id,
            @RequestBody Map<String, String> emailRequest,
            Principal principal) {

        String subject = emailRequest.get("subject");
        String message = emailRequest.get("message");

        log.info("AUDIT email.custom_sent id={} subject='{}' user='{}'",
                id, subject, actor(principal));

        return reservationRepository.findById(id)
                .map(reservation -> {
                    if (emailService != null) {
                        try {
                            emailService.sendCustomEmail(reservation, subject, message);
                            auditService.recordAction(AuditEntityType.RESERVATION, id, label(reservation),
                                    AuditAction.EMAIL_SENT, List.of(),
                                    "Custom email sent" + (subject != null ? ": " + subject : ""));
                            return ResponseEntity.ok(Map.of("status", "sent", "message", "Email sent successfully"));
                        } catch (Exception e) {
                            log.error("Failed to send custom email", e);
                            return emailFailed();
                        }
                    } else {
                        return ResponseEntity.ok(Map.of("status", "disabled", "message", "Email service is disabled"));
                    }
                })
                .orElseThrow(() -> NotFoundException.of("Reservation", id));
    }

    @GetMapping("/{id}/catering-email/preview")
    @Operation(summary = "Preview catering email", description = "Get rendered catering email template for a reservation")
    public ResponseEntity<?> previewCateringEmail(@PathVariable Long id) {
        return reservationRepository.findById(id)
                .map(reservation -> {
                    Map<String, String> vars = buildCateringVars(reservation);
                    String subject = emailTemplateService.getRenderedSubject(EmailTemplateType.CATERING_OPTIONS, vars);
                    String body = emailTemplateService.getRenderedBody(EmailTemplateType.CATERING_OPTIONS, vars);
                    return ResponseEntity.ok(Map.of("subject", subject, "body", body, "defaultReplyTo", staffEmail));
                })
                .orElseThrow(() -> NotFoundException.of("Reservation", id));
    }

    @PostMapping("/{id}/catering-email")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Send catering options email", description = "Send catering email with PDF attachments to reservation contact")
    public ResponseEntity<?> sendCateringEmail(
            @PathVariable Long id,
            @RequestBody CateringEmailRequest request,
            Principal principal) {

        log.info("AUDIT email.catering_sent id={} user='{}'",
                id, actor(principal));

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
                                actor(principal));

                        auditService.recordAction(AuditEntityType.RESERVATION, id, label(reservation),
                                AuditAction.EMAIL_SENT, List.of(),
                                "Catering email sent (" + attachments.size() + " attachment(s))");

                        return ResponseEntity.ok(Map.of("status", "sent", "message", "Catering email sent successfully"));
                    } catch (Exception e) {
                        log.error("Failed to send catering email", e);
                        return emailFailed();
                    }
                })
                .orElseThrow(() -> NotFoundException.of("Reservation", id));
    }

    /**
     * 500 problem response for a failed send. The cause stays in the logs: mail provider error
     * text can contain internal details, so staff get a generic message.
     */
    private static ResponseEntity<ProblemDetail> emailFailed() {
        return ResponseEntity.internalServerError().body(GlobalExceptionHandler.problem(
                HttpStatus.INTERNAL_SERVER_ERROR, "The email could not be sent. Please try again later."));
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
