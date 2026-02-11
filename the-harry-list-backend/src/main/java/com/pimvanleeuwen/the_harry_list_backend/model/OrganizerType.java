package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * Type of organizer for the event.
 * Maps to: "Who is the event for?" / "Type of reservation" on the forms.
 */
public enum OrganizerType {
    ASSOCIATION("Association / Study Association"),
    COMPANY("Company / Business"),
    PRIVATE("Private / Individual"),
    UNIVERSITY("University / TU/e"),
    PHD("PhD Candidate"),
    STUDENT("Student"),
    STAFF("Staff"),
    OTHER("Other");

    private final String displayName;

    OrganizerType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}