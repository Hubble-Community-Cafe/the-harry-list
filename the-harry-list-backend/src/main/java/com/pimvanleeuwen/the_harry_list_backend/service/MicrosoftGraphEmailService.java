package com.pimvanleeuwen.the_harry_list_backend.service;

import com.azure.identity.ClientSecretCredential;
import com.azure.identity.ClientSecretCredentialBuilder;
import com.microsoft.graph.models.Attachment;
import com.microsoft.graph.models.BodyType;
import com.microsoft.graph.models.EmailAddress;
import com.microsoft.graph.models.FileAttachment;
import com.microsoft.graph.models.ItemBody;
import com.microsoft.graph.models.Message;
import com.microsoft.graph.models.Recipient;
import com.microsoft.graph.serviceclient.GraphServiceClient;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailAttachment;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailTemplateType;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.model.SpecialActivity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Microsoft Graph API email service for sending emails via Microsoft 365.
 * Uses EmailTemplateService to render templates, falling back to hardcoded defaults.
 */
@Service
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "true", matchIfMissing = false)
public class MicrosoftGraphEmailService implements EmailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(MicrosoftGraphEmailService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final GraphServiceClient graphClient;
    private final EmailTemplateService emailTemplateService;
    private final String fromEmail;
    private final String staffEmail;
    private final String barName;

    public MicrosoftGraphEmailService(
            @Value("${app.mail.graph.tenant-id}") String tenantId,
            @Value("${app.mail.graph.client-id}") String clientId,
            @Value("${app.mail.graph.client-secret}") String clientSecret,
            @Value("${app.mail.from}") String fromEmail,
            @Value("${app.mail.staff}") String staffEmail,
            @Value("${app.bar.name:Hubble and Meteor Community Cafes}") String barName,
            EmailTemplateService emailTemplateService) {

        this.fromEmail = fromEmail;
        this.staffEmail = staffEmail;
        this.barName = barName;
        this.emailTemplateService = emailTemplateService;

        ClientSecretCredential credential = new ClientSecretCredentialBuilder()
                .clientId(clientId)
                .clientSecret(clientSecret)
                .tenantId(tenantId)
                .build();

        this.graphClient = new GraphServiceClient(credential);

        log.info("Microsoft Graph Email service initialized. Sending from: {}, Staff notifications to: {}",
                fromEmail, staffEmail);
    }

    @Override
    public void sendReservationSubmittedEmail(Reservation reservation) {
        try {
            Map<String, String> vars = buildBaseVars(reservation);
            String subject = emailTemplateService.getRenderedSubject(EmailTemplateType.SUBMITTED, vars);
            String body = emailTemplateService.getRenderedBody(EmailTemplateType.SUBMITTED, vars);
            sendEmail(reservation.getEmail(), subject, body);
            log.info("LOGGING email.submitted_sent confirmation='{}' to='{}'",
                    reservation.getConfirmationNumber(), reservation.getEmail());
            notifyStaffNewReservation(reservation);
        } catch (Exception e) {
            log.error("Failed to send reservation submitted email to: {}", reservation.getEmail(), e);
        }
    }

    @Override
    public void sendStatusChangeEmail(Reservation reservation, ReservationStatus oldStatus, String confirmedBy) {
        try {
            Map<String, String> vars = buildStatusChangeVars(reservation);
            String subject = emailTemplateService.getRenderedSubject(EmailTemplateType.STATUS_CHANGED, vars);
            String body = emailTemplateService.getRenderedBody(EmailTemplateType.STATUS_CHANGED, vars);
            sendEmail(reservation.getEmail(), subject, body);
            log.info("LOGGING email.status_change_sent confirmation='{}' to='{}' status={}",
                    reservation.getConfirmationNumber(), reservation.getEmail(), reservation.getStatus());
        } catch (Exception e) {
            log.error("Failed to send status change email to: {}", reservation.getEmail(), e);
        }
    }

    @Override
    public void sendReservationUpdatedEmail(Reservation reservation) {
        try {
            Map<String, String> vars = buildBaseVars(reservation);
            vars.put("status", reservation.getStatus().getDisplayName());
            String subject = emailTemplateService.getRenderedSubject(EmailTemplateType.UPDATED, vars);
            String body = emailTemplateService.getRenderedBody(EmailTemplateType.UPDATED, vars);
            sendEmail(reservation.getEmail(), subject, body);
            log.info("LOGGING email.updated_sent confirmation='{}' to='{}'",
                    reservation.getConfirmationNumber(), reservation.getEmail());
        } catch (Exception e) {
            log.error("Failed to send reservation updated email to: {}", reservation.getEmail(), e);
        }
    }

    @Override
    public void sendReservationCancelledEmail(Reservation reservation) {
        try {
            Map<String, String> vars = buildBaseVars(reservation);
            vars.put("staffEmail", staffEmail);
            String subject = emailTemplateService.getRenderedSubject(EmailTemplateType.CANCELLED, vars);
            String body = emailTemplateService.getRenderedBody(EmailTemplateType.CANCELLED, vars);
            sendEmail(reservation.getEmail(), subject, body);
            log.info("LOGGING email.cancelled_sent confirmation='{}' to='{}'",
                    reservation.getConfirmationNumber(), reservation.getEmail());
        } catch (Exception e) {
            log.error("Failed to send reservation cancelled email to: {}", reservation.getEmail(), e);
        }
    }

    @Override
    public void sendRawEmail(String to, String subject, String htmlBody) {
        try {
            sendEmail(to, subject, htmlBody);
        } catch (Exception e) {
            log.error("Failed to send raw email to: {}", to, e);
            throw new RuntimeException("Failed to send email", e);
        }
    }

    @Override
    public void sendCustomEmail(Reservation reservation, String subject, String messageContent) {
        try {
            String htmlBody = EmailTemplates.buildCustomEmailBody(reservation, messageContent, barName, staffEmail);
            sendEmail(reservation.getEmail(), subject, htmlBody);
        } catch (Exception e) {
            log.error("Failed to send custom email to: {}", reservation.getEmail(), e);
            throw new RuntimeException("Failed to send custom email", e);
        }
    }

    private void notifyStaffNewReservation(Reservation reservation) {
        try {
            Map<String, String> vars = buildStaffNotificationVars(reservation);
            String subject = emailTemplateService.getRenderedSubject(EmailTemplateType.STAFF_NOTIFICATION, vars);
            String body = emailTemplateService.getRenderedBody(EmailTemplateType.STAFF_NOTIFICATION, vars);
            sendEmail(staffEmail, subject, body);
        } catch (Exception e) {
            log.error("Failed to send staff notification", e);
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
        vars.put("payment", reservation.getPaymentOption().getDisplayName());

        // Special activities
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

    @Override
    public void sendEmailWithAttachments(String to, String subject, String htmlBody,
                                         List<EmailAttachment> attachments, String replyTo) {
        try {
            Message message = new Message();
            message.setSubject(subject);

            ItemBody body = new ItemBody();
            body.setContentType(BodyType.Html);
            body.setContent(htmlBody);
            message.setBody(body);

            Recipient toRecipient = new Recipient();
            EmailAddress toAddress = new EmailAddress();
            toAddress.setAddress(to);
            toRecipient.setEmailAddress(toAddress);
            message.setToRecipients(new LinkedList<>(List.of(toRecipient)));

            // Set reply-to if provided
            if (replyTo != null && !replyTo.isBlank()) {
                Recipient replyToRecipient = new Recipient();
                EmailAddress replyToAddress = new EmailAddress();
                replyToAddress.setAddress(replyTo);
                replyToRecipient.setEmailAddress(replyToAddress);
                message.setReplyTo(new LinkedList<>(List.of(replyToRecipient)));
            }

            // Add file attachments
            if (attachments != null && !attachments.isEmpty()) {
                List<Attachment> attachmentList = new ArrayList<>();
                for (EmailAttachment ea : attachments) {
                    FileAttachment fa = new FileAttachment();
                    fa.setOdataType("#microsoft.graph.fileAttachment");
                    fa.setName(ea.getFilename());
                    fa.setContentType(ea.getContentType());
                    fa.setContentBytes(ea.getData());
                    attachmentList.add(fa);
                }
                message.setAttachments(attachmentList);
            }

            com.microsoft.graph.users.item.sendmail.SendMailPostRequestBody requestBody =
                    new com.microsoft.graph.users.item.sendmail.SendMailPostRequestBody();
            requestBody.setMessage(message);
            requestBody.setSaveToSentItems(true);

            graphClient.users().byUserId(fromEmail).sendMail().post(requestBody);
            log.info("Email with {} attachment(s) sent to: {} via Microsoft Graph",
                    attachments != null ? attachments.size() : 0, to);
        } catch (Exception e) {
            log.error("Failed to send email with attachments to: {}", to, e);
            throw new RuntimeException("Failed to send email with attachments", e);
        }
    }

    private void sendEmail(String to, String subject, String htmlBody) {
        Message message = new Message();
        message.setSubject(subject);

        ItemBody body = new ItemBody();
        body.setContentType(BodyType.Html);
        body.setContent(htmlBody);
        message.setBody(body);

        Recipient toRecipient = new Recipient();
        EmailAddress toAddress = new EmailAddress();
        toAddress.setAddress(to);
        toRecipient.setEmailAddress(toAddress);

        LinkedList<Recipient> toRecipients = new LinkedList<>();
        toRecipients.add(toRecipient);
        message.setToRecipients(toRecipients);

        com.microsoft.graph.users.item.sendmail.SendMailPostRequestBody requestBody =
                new com.microsoft.graph.users.item.sendmail.SendMailPostRequestBody();
        requestBody.setMessage(message);
        requestBody.setSaveToSentItems(true);

        try {
            graphClient.users().byUserId(fromEmail).sendMail().post(requestBody);
            log.info("Email sent successfully to: {} via Microsoft Graph", to);
        } catch (Exception e) {
            log.error("Failed to send email to: {} via Microsoft Graph", to, e);
            throw new RuntimeException("Failed to send email", e);
        }
    }
}
