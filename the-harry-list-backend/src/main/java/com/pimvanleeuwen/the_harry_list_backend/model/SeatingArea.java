package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * The seating area preference for the reservation.
 */
public enum SeatingArea {
    INSIDE("Inside"),
    OUTSIDE("Outside (Terrace)"),
    BOTH("Both / No Preference");

    private final String displayName;

    SeatingArea(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}

