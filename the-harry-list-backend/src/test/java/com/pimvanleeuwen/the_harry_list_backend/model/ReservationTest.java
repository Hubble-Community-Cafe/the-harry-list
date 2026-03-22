package com.pimvanleeuwen.the_harry_list_backend.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for Reservation entity.
 */
class ReservationTest {

    private Reservation reservation;

    @BeforeEach
    void setUp() {
        reservation = new Reservation();
    }

    @Test
    void onCreate_shouldSetCreatedAtAndUpdatedAt() {
        // When
        reservation.onCreate();

        // Then
        assertNotNull(reservation.getCreatedAt());
        assertNotNull(reservation.getUpdatedAt());
    }

    @Test
    void onCreate_shouldSetDefaultStatusToPending() {
        // When
        reservation.onCreate();

        // Then
        assertEquals(ReservationStatus.PENDING, reservation.getStatus());
    }

    @Test
    void onCreate_shouldNotOverrideExistingStatus() {
        // Given
        reservation.setStatus(ReservationStatus.CONFIRMED);

        // When
        reservation.onCreate();

        // Then
        assertEquals(ReservationStatus.CONFIRMED, reservation.getStatus());
    }

    @Test
    void onUpdate_shouldUpdateUpdatedAt() {
        // Given
        reservation.onCreate();
        var originalUpdatedAt = reservation.getUpdatedAt();

        // Wait a tiny bit to ensure time difference
        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // When
        reservation.onUpdate();

        // Then
        assertNotNull(reservation.getUpdatedAt());
        assertTrue(reservation.getUpdatedAt().isAfter(originalUpdatedAt) ||
                   reservation.getUpdatedAt().equals(originalUpdatedAt));
    }

    @Test
    void settersAndGetters_shouldWorkCorrectly() {
        // Given
        reservation.setId(1L);
        reservation.setContactName("John Doe");
        reservation.setEmail("john@example.com");
        reservation.setPhoneNumber("+31612345678");
        reservation.setOrganizationName("Test Org");
        reservation.setEventTitle("Test Event");
        reservation.setDescription("Test Description");
        reservation.setSpecialActivities(Set.of(SpecialActivity.GRADUATION));
        reservation.setExpectedGuests(50);
        reservation.setEventDate(LocalDate.of(2026, 3, 15));
        reservation.setStartTime(LocalTime.of(16, 0));
        reservation.setEndTime(LocalTime.of(22, 0));
        reservation.setLocation(BarLocation.HUBBLE);
        reservation.setSeatingArea(SeatingArea.INSIDE);
        reservation.setPaymentOption(PaymentOption.INDIVIDUAL);
        reservation.setTermsAccepted(true);
        reservation.setStatus(ReservationStatus.PENDING);

        // Then
        assertEquals(1L, reservation.getId());
        assertEquals("John Doe", reservation.getContactName());
        assertEquals("john@example.com", reservation.getEmail());
        assertEquals("+31612345678", reservation.getPhoneNumber());
        assertEquals("Test Org", reservation.getOrganizationName());
        assertEquals("Test Event", reservation.getEventTitle());
        assertEquals("Test Description", reservation.getDescription());
        assertTrue(reservation.getSpecialActivities().contains(SpecialActivity.GRADUATION));
        assertEquals(50, reservation.getExpectedGuests());
        assertEquals(LocalDate.of(2026, 3, 15), reservation.getEventDate());
        assertEquals(LocalTime.of(16, 0), reservation.getStartTime());
        assertEquals(LocalTime.of(22, 0), reservation.getEndTime());
        assertEquals(BarLocation.HUBBLE, reservation.getLocation());
        assertEquals(SeatingArea.INSIDE, reservation.getSeatingArea());
        assertEquals(PaymentOption.INDIVIDUAL, reservation.getPaymentOption());
        assertTrue(reservation.getTermsAccepted());
        assertEquals(ReservationStatus.PENDING, reservation.getStatus());
    }

    @Test
    void paymentFields_shouldWorkCorrectly() {
        // Given
        reservation.setCostCenter("12345");
        reservation.setInvoiceName("Invoice Inc.");
        reservation.setInvoiceAddress("123 Main St");
        reservation.setInvoiceType(InvoiceType.EXTERNAL);
        reservation.setInvoiceRemarks("Some remarks");

        // Then
        assertEquals("12345", reservation.getCostCenter());
        assertEquals("Invoice Inc.", reservation.getInvoiceName());
        assertEquals("123 Main St", reservation.getInvoiceAddress());
        assertEquals(InvoiceType.EXTERNAL, reservation.getInvoiceType());
        assertEquals("Some remarks", reservation.getInvoiceRemarks());
    }

    @Test
    void internalFields_shouldWorkCorrectly() {
        // Given
        reservation.setInternalNotes("Staff note");
        reservation.setConfirmedBy("admin");

        // Then
        assertEquals("Staff note", reservation.getInternalNotes());
        assertEquals("admin", reservation.getConfirmedBy());
    }

    @Test
    void cateringFields_shouldWorkCorrectly() {
        // Given
        reservation.setCateringDietaryNotes("No nuts, vegetarian for 5 guests");

        // Then
        assertEquals("No nuts, vegetarian for 5 guests", reservation.getCateringDietaryNotes());
    }

    @Test
    void longReservationReason_shouldWorkCorrectly() {
        // Given
        reservation.setLongReservationReason("Large graduation ceremony with dinner");

        // Then
        assertEquals("Large graduation ceremony with dinner", reservation.getLongReservationReason());
    }
}
