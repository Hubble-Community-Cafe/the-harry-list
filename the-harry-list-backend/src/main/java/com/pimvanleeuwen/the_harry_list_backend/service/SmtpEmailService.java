package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.EmailAttachment;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailTemplateType;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.model.SpecialActivity;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * SMTP-based email sender used <strong>only under the {@code e2e} Spring profile</strong>.
 *
 * <p>Production sends email through {@link MicrosoftGraphEmailService}; this implementation
 * exists so end-to-end tests can deliver messages to a local catcher (Mailpit) and assert
 * on the real, rendered content. It deliberately reuses the same {@link EmailTemplateService}
 * (the editable templates) and {@link EmailTemplates} helpers as production, so what the
 * tests see matches what customers receive.</p>
 *
 * <p>It is profile-gated and never loads outside {@code e2e}, so it has no effect on prod.</p>
 */
@Service
@Profile("e2e")
public class SmtpEmailService implements EmailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final JavaMailSender mailSender;
    private final EmailTemplateService emailTemplateService;
    private final String fromEmail;
    private final String staffEmail;
    private final String barName;

    public SmtpEmailService(JavaMailSender mailSender,
                            EmailTemplateService emailTemplateService,
                            @Value("${app.mail.from}") String fromEmail,
                            @Value("${app.mail.staff}") String staffEmail,
                            @Value("${app.bar.name:Hubble and Meteor Community Cafes}") String barName) {
        this.mailSender = mailSender;
        this.emailTemplateService = emailTemplateService;
        this.fromEmail = fromEmail;
        this.staffEmail = staffEmail;
        this.barName = barName;
        log.info("SMTP (e2e) email service initialized. Sending from: {}, Staff notifications to: {}",
                fromEmail, staffEmail);
    }

    @Override
    public void sendReservationSubmittedEmail(Reservation reservation) {
        Map<String, String> vars = buildBaseVars(reservation);
        deliver(reservation.getEmail(),
                emailTemplateService.getRenderedSubject(EmailTemplateType.SUBMITTED, vars),
                emailTemplateService.getRenderedBody(EmailTemplateType.SUBMITTED, vars));

        Map<String, String> staffVars = buildStaffNotificationVars(reservation);
        deliver(staffEmail,
                emailTemplateService.getRenderedSubject(EmailTemplateType.STAFF_NOTIFICATION, staffVars),
                emailTemplateService.getRenderedBody(EmailTemplateType.STAFF_NOTIFICATION, staffVars));
    }

    @Override
    public void sendStatusChangeEmail(Reservation reservation, String customMessage) {
        Map<String, String> vars = buildStatusChangeVars(reservation);
        Map<String, String> rawHtmlVars = Map.of(
                "customMessage", EmailTemplates.buildCustomMessageBlock(customMessage));
        deliver(reservation.getEmail(),
                emailTemplateService.getRenderedSubject(EmailTemplateType.STATUS_CHANGED, vars),
                emailTemplateService.getRenderedBody(EmailTemplateType.STATUS_CHANGED, vars, rawHtmlVars));
    }

    @Override
    public void sendReservationUpdatedEmail(Reservation reservation, String customMessage) {
        Map<String, String> vars = buildBaseVars(reservation);
        vars.put("status", reservation.getStatus().getDisplayName());
        Map<String, String> rawHtmlVars = Map.of(
                "customMessage", EmailTemplates.buildCustomMessageBlock(customMessage));
        deliver(reservation.getEmail(),
                emailTemplateService.getRenderedSubject(EmailTemplateType.UPDATED, vars),
                emailTemplateService.getRenderedBody(EmailTemplateType.UPDATED, vars, rawHtmlVars));
    }

    @Override
    public void sendReservationCancelledEmail(Reservation reservation) {
        Map<String, String> vars = buildBaseVars(reservation);
        vars.put("staffEmail", staffEmail);
        deliver(reservation.getEmail(),
                emailTemplateService.getRenderedSubject(EmailTemplateType.CANCELLED, vars),
                emailTemplateService.getRenderedBody(EmailTemplateType.CANCELLED, vars));
    }

    @Override
    public void sendCustomEmail(Reservation reservation, String subject, String message) {
        deliver(reservation.getEmail(), subject,
                EmailTemplates.buildCustomEmailBody(reservation, message, barName, staffEmail));
    }

    @Override
    public void sendRawEmail(String to, String subject, String htmlBody) {
        deliver(to, subject, htmlBody, null);
    }

    @Override
    public void sendEmailWithAttachments(String to, String subject, String htmlBody,
                                         List<EmailAttachment> attachments, String replyTo) {
        // Binary attachments are not needed for e2e assertions; the message body still
        // reaches the catcher so tests can verify subject/body and recipient.
        deliver(to, subject, htmlBody, replyTo);
    }

    private void deliver(String to, String subject, String htmlBody) {
        deliver(to, subject, htmlBody, null);
    }

    private void deliver(String to, String subject, String htmlBody, String replyTo) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            if (replyTo != null && !replyTo.isBlank()) {
                helper.setReplyTo(replyTo);
            }
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("LOGGING email.smtp_sent to='{}' subject='{}'", to, subject);
        } catch (Exception e) {
            log.error("Failed to send SMTP (e2e) email to: {}", to, e);
        }
    }

    private Map<String, String> buildBaseVars(Reservation reservation) {
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
        return vars;
    }

    private Map<String, String> buildStatusChangeVars(Reservation reservation) {
        Map<String, String> vars = buildBaseVars(reservation);
        vars.put("staffEmail", staffEmail);
        vars.put("status", reservation.getStatus().getDisplayName());
        vars.put("statusMessage", resolveStatusMessage(reservation.getStatus()));
        vars.put("statusColor", resolveStatusColor(reservation.getStatus()));
        vars.put("statusSubject", resolveStatusSubject(reservation.getStatus()));
        return vars;
    }

    private Map<String, String> buildStaffNotificationVars(Reservation reservation) {
        Map<String, String> vars = new HashMap<>();
        vars.put("confirmationNumber", reservation.getConfirmationNumber());
        vars.put("contactName", reservation.getContactName());
        vars.put("email", reservation.getEmail());
        vars.put("phone", reservation.getPhoneNumber() != null ? reservation.getPhoneNumber() : "Not provided");
        vars.put("organization", reservation.getOrganizationName() != null ? reservation.getOrganizationName() : "Not provided");
        vars.put("eventTitle", reservation.getEventTitle());
        vars.put("eventDate", reservation.getEventDate().format(DATE_FORMATTER));
        vars.put("startTime", reservation.getStartTime().format(TIME_FORMATTER));
        vars.put("endTime", reservation.getEndTime().format(TIME_FORMATTER));
        vars.put("location", reservation.getLocation() != null ? reservation.getLocation().getDisplayName() : "No Preference");
        vars.put("expectedGuests", String.valueOf(reservation.getExpectedGuests()));
        vars.put("payment", reservation.getPaymentOption() != null ? reservation.getPaymentOption().getDisplayName() : "Not provided");

        Set<SpecialActivity> activities = reservation.getSpecialActivities();
        if (activities != null && !activities.isEmpty()) {
            vars.put("specialActivities", activities.stream()
                    .map(SpecialActivity::getDisplayName)
                    .collect(Collectors.joining(", ")));
        } else {
            vars.put("specialActivities", "None");
        }
        vars.put("description", reservation.getDescription() != null ? reservation.getDescription() : "");
        vars.put("comments", reservation.getComments() != null ? reservation.getComments() : "");
        return vars;
    }

    private String resolveStatusMessage(ReservationStatus status) {
        return switch (status) {
            case CONFIRMED -> "We're pleased to confirm your reservation!";
            case REJECTED -> "Unfortunately, we're unable to accommodate your reservation request at this time.";
            case CANCELLED -> "Your reservation has been cancelled as requested.";
            case COMPLETED -> "Thank you for choosing us! We hope you had a great event.";
            default -> "Your reservation status has been updated.";
        };
    }

    private String resolveStatusColor(ReservationStatus status) {
        return switch (status) {
            case CONFIRMED -> "#4CAF50";
            case REJECTED, CANCELLED -> "#f44336";
            case COMPLETED -> "#2196F3";
            default -> "#FF9800";
        };
    }

    private String resolveStatusSubject(ReservationStatus status) {
        return switch (status) {
            case CONFIRMED -> "Reservation Confirmed";
            case REJECTED -> "Reservation Request Update";
            case CANCELLED -> "Reservation Cancelled";
            case COMPLETED -> "Thank You";
            default -> "Reservation Update";
        };
    }
}
