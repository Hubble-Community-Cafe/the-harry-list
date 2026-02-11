package com.pimvanleeuwen.the_harry_list_backend.service;

import com.azure.identity.ClientSecretCredential;
import com.azure.identity.ClientSecretCredentialBuilder;
import com.microsoft.graph.models.BodyType;
import com.microsoft.graph.models.EmailAddress;
import com.microsoft.graph.models.ItemBody;
import com.microsoft.graph.models.Message;
import com.microsoft.graph.models.Recipient;
import com.microsoft.graph.serviceclient.GraphServiceClient;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.LinkedList;

/**
 * Microsoft Graph API email service for sending emails via Microsoft 365.
 * This is the only email service implementation.
 */
@Service
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "true", matchIfMissing = false)
public class MicrosoftGraphEmailService implements EmailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(MicrosoftGraphEmailService.class);

    private final GraphServiceClient graphClient;
    private final String fromEmail;
    private final String staffEmail;
    private final String barName;

    public MicrosoftGraphEmailService(
            @Value("${app.mail.graph.tenant-id}") String tenantId,
            @Value("${app.mail.graph.client-id}") String clientId,
            @Value("${app.mail.graph.client-secret}") String clientSecret,
            @Value("${app.mail.from}") String fromEmail,
            @Value("${app.mail.staff}") String staffEmail,
            @Value("${app.bar.name:Hubble and Meteor Community Cafes}") String barName) {

        this.fromEmail = fromEmail;
        this.staffEmail = staffEmail;
        this.barName = barName;

        // Create credential using Azure AD app registration
        ClientSecretCredential credential = new ClientSecretCredentialBuilder()
                .clientId(clientId)
                .clientSecret(clientSecret)
                .tenantId(tenantId)
                .build();

        // Create Graph client - use direct constructor for this SDK version
        this.graphClient = new GraphServiceClient(credential);

        log.info("Microsoft Graph Email service initialized. Sending from: {}, Staff notifications to: {}",
                fromEmail, staffEmail);
    }

    @Override
    public void sendReservationSubmittedEmail(Reservation reservation) {
        try {
            log.info("Sending reservation submitted email to: {} via Microsoft Graph", reservation.getEmail());

            String subject = "Reservation Request Received - " + reservation.getEventTitle();
            String body = EmailTemplates.buildSubmittedEmailBody(reservation, barName);

            sendEmail(reservation.getEmail(), subject, body);

            // Also notify staff
            notifyStaffNewReservation(reservation);

        } catch (Exception e) {
            log.error("Failed to send reservation submitted email to: {}", reservation.getEmail(), e);
        }
    }

    @Override
    public void sendStatusChangeEmail(Reservation reservation, ReservationStatus oldStatus, String confirmedBy) {
        try {
            log.info("Sending status change email to: {} via Microsoft Graph (status: {} -> {})",
                    reservation.getEmail(), oldStatus, reservation.getStatus());

            String subject = EmailTemplates.getStatusChangeSubject(reservation);
            String body = EmailTemplates.buildStatusChangeEmailBody(reservation, oldStatus, confirmedBy, barName, staffEmail);

            sendEmail(reservation.getEmail(), subject, body);

        } catch (Exception e) {
            log.error("Failed to send status change email to: {}", reservation.getEmail(), e);
        }
    }

    @Override
    public void sendReservationUpdatedEmail(Reservation reservation) {
        try {
            log.info("Sending reservation updated email to: {} via Microsoft Graph", reservation.getEmail());

            String subject = "Reservation Updated - " + reservation.getEventTitle();
            String body = EmailTemplates.buildUpdatedEmailBody(reservation, barName);

            sendEmail(reservation.getEmail(), subject, body);

        } catch (Exception e) {
            log.error("Failed to send reservation updated email to: {}", reservation.getEmail(), e);
        }
    }

    @Override
    public void sendReservationCancelledEmail(Reservation reservation) {
        try {
            log.info("Sending reservation cancelled email to: {} via Microsoft Graph", reservation.getEmail());

            String subject = "Reservation Cancelled - " + reservation.getEventTitle();
            String body = EmailTemplates.buildCancelledEmailBody(reservation, staffEmail, barName);

            sendEmail(reservation.getEmail(), subject, body);

        } catch (Exception e) {
            log.error("Failed to send reservation cancelled email to: {}", reservation.getEmail(), e);
        }
    }

    private void notifyStaffNewReservation(Reservation reservation) {
        try {
            String subject = "[New Reservation] " + reservation.getEventTitle() + " - " + reservation.getContactName();
            String body = EmailTemplates.buildStaffNotificationBody(reservation);

            sendEmail(staffEmail, subject, body);
        } catch (Exception e) {
            log.error("Failed to send staff notification", e);
        }
    }

    private void sendEmail(String to, String subject, String htmlBody) {
        try {
            // Create the message
            Message message = new Message();
            message.setSubject(subject);

            // Set body
            ItemBody body = new ItemBody();
            body.setContentType(BodyType.Html);
            body.setContent(htmlBody);
            message.setBody(body);

            // Set recipient
            Recipient toRecipient = new Recipient();
            EmailAddress toAddress = new EmailAddress();
            toAddress.setAddress(to);
            toRecipient.setEmailAddress(toAddress);

            LinkedList<Recipient> toRecipients = new LinkedList<>();
            toRecipients.add(toRecipient);
            message.setToRecipients(toRecipients);

            // Create SendMail request body and set the message
            com.microsoft.graph.users.item.sendmail.SendMailPostRequestBody requestBody =
                    new com.microsoft.graph.users.item.sendmail.SendMailPostRequestBody();
            requestBody.setMessage(message);
            requestBody.setSaveToSentItems(true);

            // Send the email using the configured mailbox
            graphClient.users().byUserId(fromEmail)
                    .sendMail()
                    .post(requestBody);

            log.info("Email sent successfully to: {} via Microsoft Graph", to);

        } catch (Exception e) {
            log.error("Failed to send email to: {} via Microsoft Graph", to, e);
            throw new RuntimeException("Failed to send email", e);
        }
    }
}

