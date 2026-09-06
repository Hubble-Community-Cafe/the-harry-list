package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.dto.ReservationEmailRequest;
import com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange;
import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditAction;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailAttachment;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailTemplateType;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationMailType;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatusTransitions;
import com.pimvanleeuwen.the_harry_list_backend.repository.EmailAttachmentRepository;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import com.pimvanleeuwen.the_harry_list_backend.service.AuditService;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailNotificationService;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailTemplateService;
import com.pimvanleeuwen.the_harry_list_backend.service.ReservationAnalytics;
import com.pimvanleeuwen.the_harry_list_backend.service.ReservationMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
@SecurityRequirement(name = "basicAuth")
public class AdminReservationController {

    private static final Logger log = LoggerFactory.getLogger(AdminReservationController.class);
    /** Dedicated, PII-free analytics logger scraped into Loki (job=app-analytics). */
    private static final Logger analyticsLog = LoggerFactory.getLogger("analytics");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final ReservationRepository reservationRepository;
    private final ReservationMapper reservationMapper;
    private final EmailTemplateService emailTemplateService;
    private final EmailAttachmentRepository emailAttachmentRepository;
    private final AuditService auditService;
    private final String barName;
    private final String staffEmail;

    @Autowired(required = false)
    private EmailNotificationService emailService;

    public AdminReservationController(ReservationRepository reservationRepository,
                                      ReservationMapper reservationMapper,
                                      EmailTemplateService emailTemplateService,
                                      EmailAttachmentRepository emailAttachmentRepository,
                                      AuditService auditService,
                                      @Value("${app.bar.name:Hubble and Meteor Community Cafes}") String barName,
                                      @Value("${app.mail.staff:events@hubble.cafe}") String staffEmail) {
        this.reservationRepository = reservationRepository;
        this.reservationMapper = reservationMapper;
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
    @Operation(summary = "Update reservation status",
            description = "Move a reservation to another status. Only transitions allowed by the "
                    + "workflow are accepted (see ReservationStatusTransitions); anything else is "
                    + "rejected with 400. IN_PROGRESS never emails the customer, whatever sendEmail says.")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestParam ReservationStatus status,
            @RequestParam(required = false) String confirmedBy,
            @RequestParam(required = false, defaultValue = "true") boolean sendEmail,
            @RequestParam(required = false) String customMessage,
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

                    // Reject moves the workflow does not allow (see ReservationStatusTransitions).
                    // Enforced here and not only in the admin UI, so the API cannot be driven into
                    // a state the rest of the system does not expect.
                    if (!ReservationStatusTransitions.isAllowed(oldStatus, status)) {
                        return ResponseEntity.badRequest().body(Map.of("message",
                                "Cannot change status from " + oldStatus + " to " + status));
                    }

                    reservation.setStatus(status);
                    if (confirmedBy != null && status == ReservationStatus.CONFIRMED) {
                        reservation.setConfirmedBy(confirmedBy);
                    }
                    com.pimvanleeuwen.the_harry_list_backend.model.Reservation saved = reservationRepository.save(reservation);

                    // Privacy-safe analytics: a coarse note that a status transition happened, for
                    // the terminal/meaningful states only (PENDING re-opens and IN_PROGRESS pickups
                    // are internal churn).
                    if (status != ReservationStatus.PENDING && status != ReservationStatus.IN_PROGRESS) {
                        analyticsLog.info(ReservationAnalytics.reservationStatusChangedLine(status, saved.getLocation()));
                    }

                    log.info("AUDIT reservation.status_changed id={} confirmation='{}' event='{}' date={} status={}->{} user='{}'{}",
                            id, saved.getConfirmationNumber(), saved.getEventTitle(), saved.getEventDate(),
                            oldStatus, status, principal != null ? principal.getName() : "unknown",
                            confirmedBy != null ? " confirmedBy='" + confirmedBy + "'" : "");

                    // The message content itself is not stored in the audit log (may be long); we only
                    // record that a custom message accompanied the status change.
                    boolean hasCustomMessage = customMessage != null && !customMessage.isBlank();
                    auditService.recordAction(AuditEntityType.RESERVATION, id, label(saved),
                            AuditAction.STATUS_CHANGE,
                            List.of(new FieldChange("status", String.valueOf(oldStatus), String.valueOf(status))),
                            "Status changed"
                                    + (confirmedBy != null ? " (confirmed by " + confirmedBy + ")" : "")
                                    + (hasCustomMessage ? " (with message)" : ""));

                    // Send email notification if enabled. Statuses that never notify the customer
                    // (IN_PROGRESS) ignore the flag entirely rather than trusting the caller.
                    if (sendEmail && status.notifiesCustomer() && emailService != null) {
                        try {
                            emailService.sendStatusChangeEmail(saved, customMessage);
                        } catch (Exception e) {
                            log.error("Failed to send status change email, but status was updated successfully", e);
                        }
                    }

                    return ResponseEntity.ok(reservationMapper.toDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/catering-arranged")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Toggle catering arranged", description = "Mark catering as arranged (or undo) for a reservation")
    public ResponseEntity<Reservation> updateCateringArranged(
            @PathVariable Long id,
            @RequestParam boolean arranged,
            Principal principal) {

        log.info("AUDIT reservation.catering_arranged id={} arranged={} user='{}'",
                id, arranged, principal != null ? principal.getName() : "unknown");

        return reservationRepository.findById(id)
                .map(reservation -> {
                    boolean previous = reservation.isCateringArranged();
                    reservation.setCateringArranged(arranged);
                    com.pimvanleeuwen.the_harry_list_backend.model.Reservation saved = reservationRepository.save(reservation);

                    auditService.recordAction(AuditEntityType.RESERVATION, id, label(saved),
                            AuditAction.CATERING_ARRANGED,
                            List.of(new FieldChange("cateringArranged", String.valueOf(previous), String.valueOf(arranged))),
                            arranged ? "Catering marked as arranged" : "Catering arranged unset");

                    return ResponseEntity.ok(reservationMapper.toDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/cobo-contract-signed")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Toggle CoBo contract signed",
            description = "Mark the CoBo contract as signed (or undo) for a reservation. Informational only — it gates nothing.")
    public ResponseEntity<Reservation> updateCoboContractSigned(
            @PathVariable Long id,
            @RequestParam boolean signed,
            Principal principal) {

        log.info("AUDIT reservation.cobo_contract_signed id={} signed={} user='{}'",
                id, signed, principal != null ? principal.getName() : "unknown");

        return reservationRepository.findById(id)
                .map(reservation -> {
                    boolean previous = reservation.isCoboContractSigned();
                    reservation.setCoboContractSigned(signed);
                    com.pimvanleeuwen.the_harry_list_backend.model.Reservation saved = reservationRepository.save(reservation);

                    auditService.recordAction(AuditEntityType.RESERVATION, id, label(saved),
                            AuditAction.COBO_CONTRACT_SIGNED,
                            List.of(new FieldChange("coboContractSigned", String.valueOf(previous), String.valueOf(signed))),
                            signed ? "CoBo contract marked as signed" : "CoBo contract signed unset");

                    return ResponseEntity.ok(reservationMapper.toDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/notes")
    @PreAuthorize("hasRole('EDITOR')")
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

                    // Note content is intentionally not stored in the audit log (may be long/sensitive).
                    auditService.recordAction(AuditEntityType.RESERVATION, id, label(saved),
                            AuditAction.NOTES_UPDATED, List.of(), "Internal notes updated");

                    return ResponseEntity.ok(reservationMapper.toDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/email")
    @PreAuthorize("hasRole('EDITOR')")
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
                            auditService.recordAction(AuditEntityType.RESERVATION, id, label(reservation),
                                    AuditAction.EMAIL_SENT, List.of(),
                                    "Custom email sent" + (subject != null ? ": " + subject : ""));
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

    @GetMapping("/{id}/mail/{mailType}/preview")
    @Operation(summary = "Preview a templated mail",
            description = "Get the rendered subject and body of a staff-triggered mail (CATERING, COBO) for a reservation")
    public ResponseEntity<?> previewMail(@PathVariable Long id, @PathVariable ReservationMailType mailType) {
        return reservationRepository.findById(id)
                .map(reservation -> {
                    Map<String, String> vars = buildMailVars(reservation);
                    String subject = emailTemplateService.getRenderedSubject(mailType.getTemplateType(), vars);
                    String body = emailTemplateService.getRenderedBody(mailType.getTemplateType(), vars);
                    return ResponseEntity.ok(Map.of("subject", subject, "body", body, "defaultReplyTo", staffEmail));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/mail/{mailType}")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Send a templated mail",
            description = "Send a staff-triggered mail (CATERING, COBO) with optional PDF attachments to the reservation contact. "
                    + "Rejected with 400 when the reservation does not have the matching special activity.")
    public ResponseEntity<Map<String, String>> sendMail(
            @PathVariable Long id,
            @PathVariable ReservationMailType mailType,
            @RequestBody ReservationEmailRequest request,
            Principal principal) {

        log.info("AUDIT email.{}_sent id={} user='{}'",
                mailType.name().toLowerCase(), id, principal != null ? principal.getName() : "unknown");

        return reservationRepository.findById(id)
                .map(reservation -> {
                    // The admin UI only offers applicable mails; enforce it here too so the API
                    // cannot mail catering menus to a reservation that never asked for catering.
                    if (!mailType.isAvailableFor(reservation)) {
                        return ResponseEntity.badRequest().body(Map.of("status", "error", "message",
                                mailType.getDisplayName() + " does not apply to this reservation"));
                    }

                    if (emailService == null) {
                        return ResponseEntity.ok(Map.of("status", "disabled", "message", "Email service is disabled"));
                    }

                    try {
                        // Render subject/body from template or use overrides
                        Map<String, String> vars = buildMailVars(reservation);
                        String subject = (request.getSubject() != null && !request.getSubject().isBlank())
                                ? request.getSubject()
                                : emailTemplateService.getRenderedSubject(mailType.getTemplateType(), vars);
                        String body = (request.getBody() != null && !request.getBody().isBlank())
                                ? request.getBody()
                                : emailTemplateService.getRenderedBody(mailType.getTemplateType(), vars);

                        // Load attachments
                        List<EmailAttachment> attachments = List.of();
                        if (request.getAttachmentIds() != null && !request.getAttachmentIds().isEmpty()) {
                            attachments = emailAttachmentRepository.findAllById(request.getAttachmentIds());
                        }

                        emailService.sendEmailWithAttachments(
                                reservation.getEmail(), subject, body, attachments, request.getReplyTo());

                        log.info("AUDIT email.{}_delivered confirmation='{}' to='{}' attachments={} user='{}'",
                                mailType.name().toLowerCase(),
                                reservation.getConfirmationNumber(), reservation.getEmail(), attachments.size(),
                                principal != null ? principal.getName() : "unknown");

                        auditService.recordAction(AuditEntityType.RESERVATION, id, label(reservation),
                                AuditAction.EMAIL_SENT, List.of(),
                                mailType.getDisplayName() + " email sent (" + attachments.size() + " attachment(s))");

                        return ResponseEntity.ok(Map.of("status", "sent",
                                "message", mailType.getDisplayName() + " email sent successfully"));
                    } catch (Exception e) {
                        log.error("Failed to send {} email", mailType, e);
                        return ResponseEntity.internalServerError()
                                .body(Map.of("status", "error", "message", "Failed to send email: " + e.getMessage()));
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Legacy catering-mail routes, kept so anything still pointing at them keeps working.
     * Delegates to the generalised endpoints above.
     */
    @GetMapping("/{id}/catering-email/preview")
    @Operation(summary = "Preview catering email (deprecated)",
            description = "Deprecated: use /{id}/mail/CATERING/preview instead.")
    @Deprecated
    public ResponseEntity<?> previewCateringEmail(@PathVariable Long id) {
        return previewMail(id, ReservationMailType.CATERING);
    }

    @PostMapping("/{id}/catering-email")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Send catering options email (deprecated)",
            description = "Deprecated: use POST /{id}/mail/CATERING instead.")
    @Deprecated
    public ResponseEntity<Map<String, String>> sendCateringEmail(
            @PathVariable Long id,
            @RequestBody ReservationEmailRequest request,
            Principal principal) {
        return sendMail(id, ReservationMailType.CATERING, request, principal);
    }

    private Map<String, String> buildMailVars(com.pimvanleeuwen.the_harry_list_backend.model.Reservation reservation) {
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
