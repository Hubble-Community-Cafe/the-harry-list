package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * The bar location for the reservation.
 */
public enum BarLocation {
    HUBBLE("Hubble Community Café"),
    METEOR("Meteor Community Café");

    private final String displayName;

    BarLocation(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}