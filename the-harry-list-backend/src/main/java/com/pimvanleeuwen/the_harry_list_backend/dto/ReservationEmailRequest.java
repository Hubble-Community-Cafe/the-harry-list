package com.pimvanleeuwen.the_harry_list_backend.dto;

import lombok.Data;

import java.util.List;

/**
 * Body of a staff-triggered templated mail (catering options, CoBo information).
 *
 * <p>All fields are optional: a blank {@code subject} or {@code body} falls back to the stored
 * template for the mail's type, and an empty {@code attachmentIds} sends no attachments.
 *
 * <p>The JSON shape is unchanged from when this was catering-specific, so existing clients keep
 * working against the legacy {@code /catering-email} route.
 */
@Data
public class ReservationEmailRequest {
    private List<Long> attachmentIds;
    private String subject;
    private String body;
    private String replyTo;
}
