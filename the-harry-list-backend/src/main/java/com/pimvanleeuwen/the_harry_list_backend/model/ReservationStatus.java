package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * Status of a reservation.
 */
public enum ReservationStatus {
    PENDING("Pending review"),
    CONFIRMED("Confirmed"),
    REJECTED("Rejected"),
    CANCELLED("Cancelled");

    private final String displayName;

    ReservationStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    /**
     * The status changes staff may make, matching the buttons in the admin UI: a pending
     * request is confirmed or rejected, a confirmed one can be cancelled, and a rejected or
     * cancelled one can be reopened to pending so its details can be changed.
     */
    public boolean canMoveTo(ReservationStatus next) {
        return switch (this) {
            case PENDING -> next == CONFIRMED || next == REJECTED;
            case CONFIRMED -> next == CANCELLED;
            case REJECTED, CANCELLED -> next == PENDING;
        };
    }
}

