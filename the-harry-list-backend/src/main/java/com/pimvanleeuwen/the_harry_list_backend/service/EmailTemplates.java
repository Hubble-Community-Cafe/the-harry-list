package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;

import java.time.format.DateTimeFormatter;

/**
 * Fixed HTML pieces that are not part of the editable templates in {@link EmailTemplateService}:
 * the free-text custom email and the custom-message block injected into status and update emails.
 * Shared between the SMTP and Microsoft Graph email services.
 */
public class EmailTemplates {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy");

    /** HTML-escapes text for safe use in an email body. Also used by {@link EmailTemplateService}. */
    static String escapeHtml(String input) {
        if (input == null) return "";
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }

    private static String formatLocation(Reservation reservation) {
        if (reservation.getLocation() == null) return "No Preference";
        return reservation.getLocation().getDisplayName();
    }

    public static String buildCustomEmailBody(Reservation reservation, String messageContent, String barName, String staffEmail) {
        String htmlMessage = escapeHtml(messageContent).replace("\n", "<br>");

        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #6b46c1; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .message { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #6b46c1; }
                    .details { background-color: #f0f0f0; padding: 10px; margin-top: 20px; border-radius: 5px; font-size: 12px; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Message from %s</h1>
                    </div>
                    <div class="content">
                        <p>Dear %s,</p>

                        <div class="message">
                            %s
                        </div>

                        <div class="details">
                            <p><strong>Regarding your reservation:</strong></p>
                            <p>Event: %s<br>
                            Date: %s<br>
                            Location: %s<br>
                            Confirmation #: %s</p>
                        </div>

                        <p>If you have any questions, please reply to this email or contact us at %s.</p>

                        <p>Best regards,<br>
                        %s</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            escapeHtml(barName),
            escapeHtml(reservation.getContactName()),
            htmlMessage,
            escapeHtml(reservation.getEventTitle()),
            reservation.getEventDate().format(DATE_FORMATTER),
            formatLocation(reservation),
            escapeHtml(reservation.getConfirmationNumber()),
            escapeHtml(staffEmail),
            escapeHtml(barName)
        );
    }

    /**
     * Builds the optional "custom message" block injected into status-change and update emails.
     * Returns an empty string when no message is provided, so the surrounding template renders
     * nothing. The message text is HTML-escaped (newlines become &lt;br&gt;) so the block is safe
     * to substitute as raw HTML into a template.
     */
    public static String buildCustomMessageBlock(String message) {
        if (message == null || message.isBlank()) {
            return "";
        }
        String htmlMessage = escapeHtml(message).replace("\n", "<br>");
        return String.format("""
            <div style="background-color: #ffffff; padding: 15px; margin: 15px 0; border-left: 4px solid #6b46c1;">
                <p style="margin: 0;">%s</p>
            </div>""", htmlMessage);
    }
}
