package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * Types of dynamic form constraints that can be managed by staff.
 */
public enum FormConstraintType {
    ACTIVITY_CONFLICT("Activity Conflict"),
    LOCATION_LOCK("Location Lock"),
    SEATING_LOCK("Seating Lock"),
    TIME_RESTRICTION("Time Restriction"),
    ADVANCE_BOOKING("Advance Booking"),
    GUEST_LIMIT("Guest Limit"),
    GUEST_MINIMUM("Guest Minimum");

    private final String displayName;

    FormConstraintType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
