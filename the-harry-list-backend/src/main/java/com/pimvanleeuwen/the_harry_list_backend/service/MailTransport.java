package com.pimvanleeuwen.the_harry_list_backend.service;

/**
 * Delivers a built email. Knows nothing about reservations or templates: production uses
 * {@link GraphMailTransport} (Microsoft 365), the e2e stack uses {@link SmtpMailTransport}
 * (Mailpit), and both sit behind the same {@link ReservationEmailService}.
 */
public interface MailTransport {

    /**
     * @throws RuntimeException when the email could not be delivered
     */
    void send(OutgoingEmail email);
}
