package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * Payment method for the reservation.
 * Maps to: "How would you like to pay?" on the forms.
 */
public enum PaymentOption {
    INDIVIDUAL("People pay individually"),
    ONE_PERSON("One person pays at the end"),
    INVOICE("Invoice");

    private final String displayName;

    PaymentOption(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
