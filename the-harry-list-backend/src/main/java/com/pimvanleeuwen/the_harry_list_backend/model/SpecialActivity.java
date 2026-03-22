package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * Special activities that can be selected for a reservation.
 * Replaces EventType - these drive constraints throughout the form.
 */
public enum SpecialActivity {
    GRADUATION("Graduation / PhD Defense"),
    EAT_A_LA_CARTE("Eat a la carte"),
    EAT_CATERING("Eat catering"),
    CATERING_CORONA_ROOM("Catering in the Corona Room"),
    PRIVATE_EVENT("Private event");

    private final String displayName;

    SpecialActivity(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
