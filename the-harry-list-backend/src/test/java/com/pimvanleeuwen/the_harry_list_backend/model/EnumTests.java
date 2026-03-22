package com.pimvanleeuwen.the_harry_list_backend.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for enum types.
 */
class EnumTests {

    @Test
    void specialActivity_shouldHaveCorrectDisplayNames() {
        assertEquals("Graduation / PhD Defense", SpecialActivity.GRADUATION.getDisplayName());
        assertEquals("Eat a la carte", SpecialActivity.EAT_A_LA_CARTE.getDisplayName());
        assertEquals("Eat catering", SpecialActivity.EAT_CATERING.getDisplayName());
        assertEquals("Catering in the Corona Room", SpecialActivity.CATERING_CORONA_ROOM.getDisplayName());
        assertEquals("Private event", SpecialActivity.PRIVATE_EVENT.getDisplayName());
    }

    @Test
    void specialActivity_shouldHaveAllExpectedValues() {
        SpecialActivity[] values = SpecialActivity.values();
        assertEquals(5, values.length);
    }

    @Test
    void invoiceType_shouldHaveCorrectDisplayNames() {
        assertEquals("TU/e", InvoiceType.TUE.getDisplayName());
        assertEquals("Fontys", InvoiceType.FONTYS.getDisplayName());
        assertEquals("External", InvoiceType.EXTERNAL.getDisplayName());
    }

    @Test
    void invoiceType_shouldHaveAllExpectedValues() {
        InvoiceType[] values = InvoiceType.values();
        assertEquals(3, values.length);
    }

    @Test
    void paymentOption_shouldHaveCorrectDisplayNames() {
        assertEquals("People pay individually", PaymentOption.INDIVIDUAL.getDisplayName());
        assertEquals("One person pays at the end", PaymentOption.ONE_PERSON.getDisplayName());
        assertEquals("Invoice", PaymentOption.INVOICE.getDisplayName());
    }

    @Test
    void paymentOption_shouldHaveAllExpectedValues() {
        PaymentOption[] values = PaymentOption.values();
        assertEquals(3, values.length);
    }

    @Test
    void barLocation_shouldHaveCorrectDisplayNames() {
        assertEquals("Hubble Community Café", BarLocation.HUBBLE.getDisplayName());
        assertEquals("Meteor Community Café", BarLocation.METEOR.getDisplayName());
        assertEquals("No Preference", BarLocation.NO_PREFERENCE.getDisplayName());
    }

    @Test
    void barLocation_shouldHaveAllExpectedValues() {
        BarLocation[] values = BarLocation.values();
        assertEquals(3, values.length);
    }

    @Test
    void seatingArea_shouldHaveCorrectDisplayNames() {
        assertEquals("Inside", SeatingArea.INSIDE.getDisplayName());
        assertEquals("Outside (Terrace)", SeatingArea.OUTSIDE.getDisplayName());
    }

    @Test
    void seatingArea_shouldHaveAllExpectedValues() {
        SeatingArea[] values = SeatingArea.values();
        assertEquals(2, values.length);
    }

    @Test
    void reservationStatus_shouldHaveCorrectDisplayNames() {
        assertEquals("Pending Review", ReservationStatus.PENDING.getDisplayName());
        assertEquals("Confirmed", ReservationStatus.CONFIRMED.getDisplayName());
        assertEquals("Rejected", ReservationStatus.REJECTED.getDisplayName());
        assertEquals("Cancelled", ReservationStatus.CANCELLED.getDisplayName());
        assertEquals("Completed", ReservationStatus.COMPLETED.getDisplayName());
    }

    @Test
    void reservationStatus_shouldHaveAllExpectedValues() {
        ReservationStatus[] values = ReservationStatus.values();
        assertEquals(5, values.length);
    }
}
