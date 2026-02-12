package com.pimvanleeuwen.the_harry_list_backend.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for enum types.
 */
class EnumTests {

    @Test
    void eventType_shouldHaveCorrectDisplayNames() {
        assertEquals("Borrel / Drinks", EventType.BORREL.getDisplayName());
        assertEquals("Lunch", EventType.LUNCH.getDisplayName());
        assertEquals("Activity", EventType.ACTIVITY.getDisplayName());
        assertEquals("Graduation / PhD Defense", EventType.GRADUATION.getDisplayName());
        assertEquals("Dinner", EventType.DINNER.getDisplayName());
        assertEquals("Party", EventType.PARTY.getDisplayName());
        assertEquals("Meeting", EventType.MEETING.getDisplayName());
        assertEquals("Other", EventType.OTHER.getDisplayName());
    }

    @Test
    void eventType_shouldHaveAllExpectedValues() {
        EventType[] values = EventType.values();
        assertEquals(8, values.length);
    }

    @Test
    void organizerType_shouldHaveCorrectDisplayNames() {
        assertEquals("Association / Study Association", OrganizerType.ASSOCIATION.getDisplayName());
        assertEquals("Company / Business", OrganizerType.COMPANY.getDisplayName());
        assertEquals("Private / Individual", OrganizerType.PRIVATE.getDisplayName());
        assertEquals("University / TU/e", OrganizerType.UNIVERSITY.getDisplayName());
        assertEquals("PhD Candidate", OrganizerType.PHD.getDisplayName());
        assertEquals("Student", OrganizerType.STUDENT.getDisplayName());
        assertEquals("Staff", OrganizerType.STAFF.getDisplayName());
        assertEquals("Other", OrganizerType.OTHER.getDisplayName());
    }

    @Test
    void organizerType_shouldHaveAllExpectedValues() {
        OrganizerType[] values = OrganizerType.values();
        assertEquals(8, values.length);
    }

    @Test
    void paymentOption_shouldHaveCorrectDisplayNames() {
        assertEquals("People pay individually", PaymentOption.INDIVIDUAL.getDisplayName());
        assertEquals("One person pays at the end", PaymentOption.ONE_PERSON.getDisplayName());
        assertEquals("Invoice (>50 euros only)", PaymentOption.INVOICE.getDisplayName());
        assertEquals("Kostenplaats", PaymentOption.COST_CENTER.getDisplayName());
        assertEquals("Vouchers/Coins", PaymentOption.VOUCHERS.getDisplayName());
    }

    @Test
    void paymentOption_shouldHaveAllExpectedValues() {
        PaymentOption[] values = PaymentOption.values();
        assertEquals(5, values.length);
    }

    @Test
    void barLocation_shouldHaveCorrectDisplayNames() {
        assertEquals("Hubble Community Café", BarLocation.HUBBLE.getDisplayName());
        assertEquals("Meteor Community Café", BarLocation.METEOR.getDisplayName());
    }

    @Test
    void barLocation_shouldHaveAllExpectedValues() {
        BarLocation[] values = BarLocation.values();
        assertEquals(2, values.length);
    }

    @Test
    void dietaryPreference_shouldHaveCorrectDisplayNames() {
        assertEquals("No special requirements", DietaryPreference.NONE.getDisplayName());
        assertEquals("Vegetarian", DietaryPreference.VEGETARIAN.getDisplayName());
        assertEquals("Vegan", DietaryPreference.VEGAN.getDisplayName());
        assertEquals("Halal", DietaryPreference.HALAL.getDisplayName());
        assertEquals("Gluten-free", DietaryPreference.GLUTEN_FREE.getDisplayName());
        assertEquals("Lactose-free", DietaryPreference.LACTOSE_FREE.getDisplayName());
        assertEquals("Nut allergy", DietaryPreference.NUT_ALLERGY.getDisplayName());
        assertEquals("Other (specify in comments)", DietaryPreference.OTHER.getDisplayName());
    }

    @Test
    void dietaryPreference_shouldHaveAllExpectedValues() {
        DietaryPreference[] values = DietaryPreference.values();
        assertEquals(8, values.length);
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

