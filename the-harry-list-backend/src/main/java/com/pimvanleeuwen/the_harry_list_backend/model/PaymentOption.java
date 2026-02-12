package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * Payment method for the reservation.
 * Maps to: "How would you like to pay?" on the forms.
 */
public enum PaymentOption {
    INDIVIDUAL("People pay individually"),
    ONE_PERSON("One person pays at the end"),
    INVOICE("Invoice (>50 euros only)"),
    COST_CENTER("Kostenplaats"),
    VOUCHERS("Vouchers/Coins");

    private final String displayName;

    PaymentOption(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}