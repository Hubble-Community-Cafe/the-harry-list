package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;

/**
 * Interface for email notification services.
 * Allows switching between SMTP and Microsoft Graph implementations.
 */
public interface EmailNotificationService {

    /**
     * Send confirmation email when a reservation is submitted.
     */
    void sendReservationSubmittedEmail(Reservation reservation);

    /**
     * Send email when reservation status changes.
     */
    void sendStatusChangeEmail(Reservation reservation, ReservationStatus oldStatus, String confirmedBy);

    /**
     * Send email when reservation is updated.
     */
    void sendReservationUpdatedEmail(Reservation reservation);

    /**
     * Send email when reservation is deleted/cancelled.
     */
    void sendReservationCancelledEmail(Reservation reservation);

    /**
     * Send a custom email to the reservation contact.
     */
    void sendCustomEmail(Reservation reservation, String subject, String message);
}

