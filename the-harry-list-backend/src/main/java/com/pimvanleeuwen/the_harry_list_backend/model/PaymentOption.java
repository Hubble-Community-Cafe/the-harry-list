package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * Payment method for the reservation.
 * Maps to: "How would you like to pay?" on the forms.
 */
public enum PaymentOption {
    PIN("PIN / Card payment on site"),
    CASH("Cash payment on site"),
    INVOICE("Invoice afterwards"),
    COST_CENTER("TU/e Cost Center (Kostenplaats)"),
    PREPAID("Prepaid / Bank transfer");

    private final String displayName;

    PaymentOption(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}