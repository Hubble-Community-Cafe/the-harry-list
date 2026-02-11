package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * Status of a reservation.
 */
public enum ReservationStatus {
    PENDING("Pending Review"),
    CONFIRMED("Confirmed"),
    REJECTED("Rejected"),
    CANCELLED("Cancelled"),
    COMPLETED("Completed");

    private final String displayName;

    ReservationStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}

