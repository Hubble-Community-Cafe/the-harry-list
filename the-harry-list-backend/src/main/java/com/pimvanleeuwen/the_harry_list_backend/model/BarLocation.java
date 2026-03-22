package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * The bar location for the reservation.
 * NO_PREFERENCE means the customer has no location preference (admin must set before confirming).
 */
public enum BarLocation {
    HUBBLE("Hubble Community Café"),
    METEOR("Meteor Community Café"),
    NO_PREFERENCE("No Preference");

    private final String displayName;

    BarLocation(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
