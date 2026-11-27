package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * Types of dynamic form constraints that can be managed by staff.
 */
public enum FormConstraintType {
    ACTIVITY_CONFLICT("Activity conflict"),
    LOCATION_LOCK("Location lock"),
    SEATING_LOCK("Seating lock"),
    TIME_RESTRICTION("Time restriction"),
    ADVANCE_BOOKING("Advance notice"),
    GUEST_LIMIT("Guest limit"),
    GUEST_MINIMUM("Guest minimum"),
    /** Advisory only: shows a message when the trigger activity is selected (no enforcement). */
    ACTIVITY_NOTICE("Activity notice");

    private final String displayName;

    FormConstraintType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
