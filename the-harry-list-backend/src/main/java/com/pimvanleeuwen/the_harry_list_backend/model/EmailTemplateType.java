package com.pimvanleeuwen.the_harry_list_backend.model;

public enum EmailTemplateType {

    SUBMITTED("Submission Confirmation", "Sent to the customer immediately after they submit a reservation request."),
    STATUS_CHANGED("Status Change", "Sent to the customer when their reservation status changes (confirmed, rejected, etc.)."),
    UPDATED("Reservation Updated", "Sent to the customer when their reservation details are modified by staff."),
    CANCELLED("Reservation Cancelled", "Sent to the customer when their reservation is cancelled."),
    STAFF_NOTIFICATION("Staff Notification", "Sent to staff when a new reservation request is submitted.");

    private final String displayName;
    private final String description;

    EmailTemplateType(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String getDisplayName() { return displayName; }
    public String getDescription() { return description; }
}
