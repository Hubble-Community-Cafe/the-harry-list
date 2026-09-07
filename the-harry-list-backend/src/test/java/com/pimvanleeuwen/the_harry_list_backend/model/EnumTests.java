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
        assertEquals("Catering Corona Room", SpecialActivity.CATERING_CORONA_ROOM.getDisplayName());
        assertEquals("Private event", SpecialActivity.PRIVATE_EVENT.getDisplayName());
        assertEquals("CoBo (Constitution Drink)", SpecialActivity.COBO.getDisplayName());
    }

    @Test
    void specialActivity_shouldHaveAllExpectedValues() {
        SpecialActivity[] values = SpecialActivity.values();
        assertEquals(6, values.length);
    }

    /**
     * Activity names are persisted into reservation_special_activities.special_activity, sized
     * for CATERING_CORONA_ROOM. A longer name would need a schema change production cannot make
     * itself (ddl-auto=validate).
     */
    @Test
    void specialActivity_namesFitThePersistedColumn() {
        for (SpecialActivity activity : SpecialActivity.values()) {
            assertTrue(activity.name().length() <= 20,
                    "Activity name too long for the special_activity column: " + activity.name());
        }
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
        assertEquals("In Progress", ReservationStatus.IN_PROGRESS.getDisplayName());
        assertEquals("Confirmed", ReservationStatus.CONFIRMED.getDisplayName());
        assertEquals("Rejected", ReservationStatus.REJECTED.getDisplayName());
        assertEquals("Cancelled", ReservationStatus.CANCELLED.getDisplayName());
        assertEquals("Completed", ReservationStatus.COMPLETED.getDisplayName());
    }

    @Test
    void reservationStatus_shouldHaveAllExpectedValues() {
        ReservationStatus[] values = ReservationStatus.values();
        assertEquals(6, values.length);
    }

    @Test
    void reservationStatus_onlyInProgressSkipsTheCustomerEmail() {
        for (ReservationStatus status : ReservationStatus.values()) {
            assertEquals(status != ReservationStatus.IN_PROGRESS, status.notifiesCustomer(),
                    "notifiesCustomer() for " + status);
        }
    }

    /**
     * The status column is pinned to VARCHAR(32) in the entity. Guards against a future status
     * name outgrowing the deployed column, which production (ddl-auto=validate) would not catch.
     */
    @Test
    void reservationStatus_namesFitThePersistedColumn() {
        for (ReservationStatus status : ReservationStatus.values()) {
            assertTrue(status.name().length() <= 32,
                    "Status name too long for the status column: " + status.name());
        }
    }

    /**
     * Without {@code @JdbcTypeCode(VARCHAR)}, Hibernate maps a string enum to a native MariaDB
     * {@code ENUM(...)} column, and adding a value then fails at runtime with "Data truncated"
     * until someone remembers to ALTER the column, a failure production's ddl-auto=validate
     * does not catch. These columns must stay varchar-mapped.
     */
    @Test
    void enumColumns_areMappedToVarcharNotNativeEnum() throws Exception {
        assertVarcharMapped(Reservation.class.getDeclaredField("status"));
        assertVarcharMapped(Reservation.class.getDeclaredField("specialActivities"));
        assertVarcharMapped(EmailTemplate.class.getDeclaredField("templateType"));
    }

    private static void assertVarcharMapped(java.lang.reflect.Field field) {
        org.hibernate.annotations.JdbcTypeCode annotation =
                field.getAnnotation(org.hibernate.annotations.JdbcTypeCode.class);
        assertNotNull(annotation,
                field.getName() + " must carry @JdbcTypeCode(VARCHAR) to avoid a native ENUM column");
        assertEquals(org.hibernate.type.SqlTypes.VARCHAR, annotation.value(),
                field.getName() + " must be mapped to VARCHAR");
    }
}
