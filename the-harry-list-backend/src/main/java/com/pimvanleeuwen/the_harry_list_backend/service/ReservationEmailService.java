package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.EmailAttachment;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

/**
 * The email notifications, the same for every environment: {@link EmailMessages} builds the
 * message and a {@link MailTransport} delivers it (Graph in production, SMTP in e2e).
 * Wired in {@link com.pimvanleeuwen.the_harry_list_backend.config.MailConfig}.
 *
 * <p>Failure policy: notifications that follow a change (submitted, status, updated,
 * cancelled) are logged and swallowed, because the change itself already succeeded. Emails
 * staff send on purpose (custom, catering, template test) throw, so staff see the failure.
 * Logs name the confirmation number, never the guest.
 */
public class ReservationEmailService implements EmailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(ReservationEmailService.class);

    private final MailTransport transport;
    private final EmailMessages messages;

    public ReservationEmailService(MailTransport transport, EmailMessages messages) {
        this.transport = transport;
        this.messages = messages;
    }

    @Override
    public void sendReservationSubmittedEmail(Reservation reservation) {
        notify("submitted", reservation, "", () -> messages.submitted(reservation));
        // Sent on its own, so staff hear about the request even if the guest's email bounces.
        notify("staff_notification", reservation, "", () -> messages.staffNotification(reservation));
    }

    @Override
    public void sendStatusChangeEmail(Reservation reservation, String customMessage) {
        notify("status_change", reservation, " status=" + reservation.getStatus(),
                () -> messages.statusChanged(reservation, customMessage));
    }

    @Override
    public void sendReservationUpdatedEmail(Reservation reservation, String customMessage) {
        notify("updated", reservation, "", () -> messages.updated(reservation, customMessage));
    }

    @Override
    public void sendReservationCancelledEmail(Reservation reservation) {
        notify("cancelled", reservation, "", () -> messages.cancelled(reservation));
    }

    @Override
    public void sendCustomEmail(Reservation reservation, String subject, String message) {
        sendOrThrow("custom", messages.custom(reservation, subject, message));
        log.info("LOGGING email.custom_sent confirmation='{}'", reservation.getConfirmationNumber());
    }

    @Override
    public void sendRawEmail(String to, String subject, String htmlBody) {
        sendOrThrow("raw", new OutgoingEmail(to, subject, htmlBody, messages.staffEmail()));
    }

    @Override
    public void sendEmailWithAttachments(String to, String subject, String htmlBody,
                                         List<EmailAttachment> attachments, String replyTo) {
        sendOrThrow("with attachments", new OutgoingEmail(to, subject, htmlBody, replyTo, attachments));
    }

    private void notify(String event, Reservation reservation, String details,
                        java.util.function.Supplier<OutgoingEmail> message) {
        try {
            transport.send(message.get());
            log.info("LOGGING email.{}_sent confirmation='{}'{}", event, reservation.getConfirmationNumber(), details);
        } catch (Exception e) {
            log.error("Failed to send {} email for confirmation={}", event, reservation.getConfirmationNumber(), e);
        }
    }

    private void sendOrThrow(String kind, OutgoingEmail email) {
        try {
            transport.send(email);
        } catch (RuntimeException e) {
            log.error("Failed to send {} email", kind, e);
            throw e;
        }
    }
}
