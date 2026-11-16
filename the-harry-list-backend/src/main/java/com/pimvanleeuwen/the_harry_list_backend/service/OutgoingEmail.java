package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.EmailAttachment;

import java.util.List;

/**
 * A fully built email, ready for a {@link MailTransport} to deliver.
 *
 * @param replyTo where replies go; null or blank leaves the sender's default
 * @param attachments files to attach; never null
 */
public record OutgoingEmail(String to, String subject, String htmlBody, String replyTo,
                            List<EmailAttachment> attachments) {

    public OutgoingEmail {
        attachments = attachments == null ? List.of() : List.copyOf(attachments);
    }

    public OutgoingEmail(String to, String subject, String htmlBody, String replyTo) {
        this(to, subject, htmlBody, replyTo, List.of());
    }
}
