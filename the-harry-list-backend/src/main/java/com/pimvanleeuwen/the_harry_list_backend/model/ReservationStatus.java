package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * Status of a reservation.
 *
 * <p>Persisted as a string ({@link jakarta.persistence.EnumType#STRING}), so the declaration
 * order carries no meaning and new values can be inserted anywhere. See
 * {@link ReservationStatusTransitions} for which moves between these values are allowed.
 */
public enum ReservationStatus {
    PENDING("Pending Review"),
    /**
     * Staff have picked the request up and are working on it (checking availability, arranging
     * catering, waiting on the customer). Purely internal: the customer is never emailed about
     * this status, and everything read-only treats it exactly like {@link #PENDING}.
     */
    IN_PROGRESS("In Progress"),
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

    /**
     * Whether reaching this status notifies the customer by email. {@link #IN_PROGRESS} is an
     * internal bookkeeping state, so it never does — enforced server-side rather than only in
     * the admin UI, so a hand-crafted API call cannot mail a customer either.
     */
    public boolean notifiesCustomer() {
        return this != IN_PROGRESS;
    }
}

