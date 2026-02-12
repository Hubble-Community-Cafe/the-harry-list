package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;

import java.time.format.DateTimeFormatter;

/**
 * Utility class containing email templates.
 * Shared between SMTP and Microsoft Graph email services.
 */
public class EmailTemplates {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    public static String buildSubmittedEmailBody(Reservation reservation, String barName) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                    .confirmation-number { font-size: 24px; font-weight: bold; color: #4CAF50; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Reservation Request Received</h1>
                    </div>
                    <div class="content">
                        <p>Dear %s,</p>
                        <p>Thank you for reaching out to us. Please consider that reservations made less then 72 hours in advance cannot always be confirmed or denied in time. If you don't receive a confirmation, you are still welcome to visit us if capacity allows!</p>
                        <p>This is not a confirmation, your reservation still awaits approval! Please note that we generally do not reply within 72 hours.</p>
                        
                        <div class="details">
                            <p><strong>Confirmation Number:</strong> <span class="confirmation-number">%s</span></p>
                            <p><strong>Event:</strong> %s</p>
                            <p><strong>Date:</strong> %s</p>
                            <p><strong>Time:</strong> %s - %s</p>
                            <p><strong>Location:</strong> %s</p>
                            <p><strong>Expected Guests:</strong> %d</p>
                            <p><strong>Status:</strong> <em>Pending Review</em></p>
                        </div>
                        
                        <p>If you have any questions, please don't hesitate to contact us.</p>
                        
                        <p>Best regards,<br>
                        %s</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            reservation.getContactName(),
            reservation.getConfirmationNumber(),
            reservation.getEventTitle(),
            reservation.getEventDate().format(DATE_FORMATTER),
            reservation.getStartTime().format(TIME_FORMATTER),
            reservation.getEndTime().format(TIME_FORMATTER),
            reservation.getLocation().getDisplayName(),
            reservation.getExpectedGuests(),
            barName
        );
    }

    public static String buildStatusChangeEmailBody(Reservation reservation, ReservationStatus oldStatus,
                                                     String confirmedBy, String barName, String staffEmail) {
        String statusMessage;
        if (reservation.getStatus() == ReservationStatus.CONFIRMED) {
            statusMessage = "We're pleased to confirm your reservation!";
        } else if (reservation.getStatus() == ReservationStatus.REJECTED) {
            statusMessage = "Unfortunately, we're unable to accommodate your reservation request at this time.";
        } else if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            statusMessage = "Your reservation has been cancelled as requested.";
        } else if (reservation.getStatus() == ReservationStatus.COMPLETED) {
            statusMessage = "Thank you for choosing us! We hope you had a great event.";
        } else {
            statusMessage = "Your reservation status has been updated.";
        }

        String statusColor;
        if (reservation.getStatus() == ReservationStatus.CONFIRMED) {
            statusColor = "#4CAF50";
        } else if (reservation.getStatus() == ReservationStatus.REJECTED || reservation.getStatus() == ReservationStatus.CANCELLED) {
            statusColor = "#f44336";
        } else if (reservation.getStatus() == ReservationStatus.COMPLETED) {
            statusColor = "#2196F3";
        } else {
            statusColor = "#FF9800";
        }

        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: %s; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid %s; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Reservation %s</h1>
                    </div>
                    <div class="content">
                        <p>Dear %s,</p>
                        <p>%s</p>
                        
                        <div class="details">
                            <p><strong>Confirmation Number:</strong> %s</p>
                            <p><strong>Event:</strong> %s</p>
                            <p><strong>Date:</strong> %s</p>
                            <p><strong>Time:</strong> %s - %s</p>
                            <p><strong>Location:</strong> %s</p>
                            <p><strong>Guests:</strong> %d</p>
                            <p><strong>Status:</strong> %s</p>
                        </div>
                        
                        <p>Best regards,<br>
                        %s</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            statusColor,
            statusColor,
            reservation.getStatus().getDisplayName(),
            reservation.getContactName(),
            statusMessage,
            reservation.getConfirmationNumber(),
            reservation.getEventTitle(),
            reservation.getEventDate().format(DATE_FORMATTER),
            reservation.getStartTime().format(TIME_FORMATTER),
            reservation.getEndTime().format(TIME_FORMATTER),
            reservation.getLocation().getDisplayName(),
            reservation.getExpectedGuests(),
            reservation.getStatus().getDisplayName(),
            barName
        );
    }

    public static String buildUpdatedEmailBody(Reservation reservation, String barName) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #FF9800; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Reservation Updated</h1>
                    </div>
                    <div class="content">
                        <p>Dear %s,</p>
                        <p>Your reservation has been updated. Please review the details below:</p>
                        
                        <div class="details">
                            <p><strong>Confirmation Number:</strong> %s</p>
                            <p><strong>Event:</strong> %s</p>
                            <p><strong>Date:</strong> %s</p>
                            <p><strong>Time:</strong> %s - %s</p>
                            <p><strong>Location:</strong> %s</p>
                            <p><strong>Guests:</strong> %d</p>
                            <p><strong>Status:</strong> %s</p>
                        </div>
                        
                        <p>If you did not request this change or have any questions, please contact us immediately.</p>
                        
                        <p>Best regards,<br>
                        %s</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            reservation.getContactName(),
            reservation.getConfirmationNumber(),
            reservation.getEventTitle(),
            reservation.getEventDate().format(DATE_FORMATTER),
            reservation.getStartTime().format(TIME_FORMATTER),
            reservation.getEndTime().format(TIME_FORMATTER),
            reservation.getLocation().getDisplayName(),
            reservation.getExpectedGuests(),
            reservation.getStatus().getDisplayName(),
            barName
        );
    }

    public static String buildCancelledEmailBody(Reservation reservation, String staffEmail, String barName) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Reservation Cancelled</h1>
                    </div>
                    <div class="content">
                        <p>Dear %s,</p>
                        <p>Your reservation <strong>%s</strong> (Confirmation #%s) has been cancelled.</p>
                        
                        <p>We hope to see you again in the future! If you'd like to make a new reservation, please visit our website.</p>
                        
                        <p>If you have any questions, please contact us at %s.</p>
                        
                        <p>Best regards,<br>
                        %s</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message. Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            reservation.getContactName(),
            reservation.getEventTitle(),
            reservation.getConfirmationNumber(),
            staffEmail,
            barName
        );
    }

    public static String buildStaffNotificationBody(Reservation reservation) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2196F3; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>New Reservation Request</h1>
                    </div>
                    <div class="content">
                        <p>A new reservation has been submitted and requires review:</p>
                        
                        <div class="details">
                            <p><strong>Reservation Number:</strong> %s</p>
                            <p><strong>Contact:</strong> %s</p>
                            <p><strong>Email:</strong> %s</p>
                            <p><strong>Phone:</strong> %s</p>
                            <p><strong>Organization:</strong> %s</p>
                            <hr>
                            <p><strong>Event:</strong> %s</p>
                            <p><strong>Type:</strong> %s (%s)</p>
                            <p><strong>Date:</strong> %s</p>
                            <p><strong>Time:</strong> %s - %s</p>
                            <p><strong>Location:</strong> %s</p>
                            <p><strong>Guests:</strong> %d</p>
                            <p><strong>Payment:</strong> %s</p>
                            %s
                            %s
                            %s
                        </div>
                        
                        <p>Please review and respond to the customer as soon as possible.</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            reservation.getConfirmationNumber(),
            reservation.getContactName(),
            reservation.getEmail(),
            reservation.getPhoneNumber() != null ? reservation.getPhoneNumber() : "Not provided",
            reservation.getOrganizationName() != null ? reservation.getOrganizationName() : "Not provided",
            reservation.getEventTitle(),
            reservation.getEventType().getDisplayName(),
            reservation.getOrganizerType().getDisplayName(),
            reservation.getEventDate().format(DATE_FORMATTER),
            reservation.getStartTime().format(TIME_FORMATTER),
            reservation.getEndTime().format(TIME_FORMATTER),
            reservation.getLocation().getDisplayName(),
            reservation.getExpectedGuests(),
            reservation.getPaymentOption().getDisplayName(),
            reservation.getFoodRequired() != null && reservation.getFoodRequired()
                ? "<p><strong>Food Required:</strong> Yes (Dietary: " +
                  (reservation.getDietaryPreference() != null ? reservation.getDietaryPreference().getDisplayName() : "None") + ")</p>"
                : "",
            reservation.getDescription() != null && !reservation.getDescription().isEmpty()
                ? "<p><strong>Description:</strong> " + reservation.getDescription() + "</p>"
                : "",
            reservation.getComments() != null && !reservation.getComments().isEmpty()
                ? "<p><strong>Comments:</strong> " + reservation.getComments() + "</p>"
                : ""
        );
    }

    public static String getStatusChangeSubject(Reservation reservation) {
        if (reservation.getStatus() == ReservationStatus.CONFIRMED) {
            return "Reservation Confirmed - " + reservation.getEventTitle();
        } else if (reservation.getStatus() == ReservationStatus.REJECTED) {
            return "Reservation Request - " + reservation.getEventTitle();
        } else if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            return "Reservation Cancelled - " + reservation.getEventTitle();
        } else if (reservation.getStatus() == ReservationStatus.COMPLETED) {
            return "Thank You - " + reservation.getEventTitle();
        } else {
            return "Reservation Update - " + reservation.getEventTitle();
        }
    }

    public static String buildCustomEmailBody(Reservation reservation, String messageContent, String barName, String staffEmail) {
        // Convert line breaks in the message to HTML
        String htmlMessage = messageContent.replace("\n", "<br>");

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
            barName,
            reservation.getContactName(),
            htmlMessage,
            reservation.getEventTitle(),
            reservation.getEventDate().format(DATE_FORMATTER),
            reservation.getLocation().getDisplayName(),
            reservation.getConfirmationNumber(),
            staffEmail,
            barName
        );
    }
}

