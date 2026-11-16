package com.pimvanleeuwen.the_harry_list_backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

/**
 * e2e-only delivery: sends over SMTP to the local Mailpit catcher, so end-to-end tests can
 * assert on the real, rendered messages. Wired only under the {@code e2e} profile
 * (see {@link com.pimvanleeuwen.the_harry_list_backend.config.MailConfig}).
 *
 * <p>Binary attachments are left off: e2e asserts on recipient, subject and body only.
 */
public class SmtpMailTransport implements MailTransport {

    private final JavaMailSender mailSender;
    private final String fromEmail;

    public SmtpMailTransport(JavaMailSender mailSender, String fromEmail) {
        this.mailSender = mailSender;
        this.fromEmail = fromEmail;
    }

    @Override
    public void send(OutgoingEmail email) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(email.to());
            if (email.replyTo() != null && !email.replyTo().isBlank()) {
                helper.setReplyTo(email.replyTo());
            }
            helper.setSubject(email.subject());
            helper.setText(email.htmlBody(), true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new IllegalStateException("Could not build the SMTP message", e);
        }
    }
}
