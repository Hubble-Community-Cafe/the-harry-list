package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * Type of event/reservation.
 * Maps to: "What kind of event is it?" on the forms.
 */
public enum EventType {
    BORREL("Borrel / Drinks"),
    LUNCH("Lunch"),
    ACTIVITY("Activity"),
    GRADUATION("Graduation / PhD Defense"),
    DINNER("Dinner"),
    PARTY("Party"),
    MEETING("Meeting"),
    OTHER("Other");

    private final String displayName;

    EventType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}