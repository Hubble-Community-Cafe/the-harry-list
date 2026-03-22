package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * Sub-type for invoice payments.
 * Only applicable when paymentOption is INVOICE.
 */
public enum InvoiceType {
    TUE("TU/e"),
    FONTYS("Fontys"),
    EXTERNAL("External");

    private final String displayName;

    InvoiceType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
