package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ICalendarService.
 */
@ExtendWith(MockitoExtension.class)
class ICalendarServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @InjectMocks
    private ICalendarService iCalendarService;

    private Reservation sampleReservation;

    @BeforeEach
    void setUp() {
        sampleReservation = createSampleReservation();
    }

    @Test
    void generateCalendarFeed_shouldReturnValidIcsFormat() {
        // Given
        when(reservationRepository.findAll()).thenReturn(List.of(sampleReservation));

        // When
        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        // Then
        assertNotNull(ics);
        assertTrue(ics.startsWith("BEGIN:VCALENDAR"));
        assertTrue(ics.contains("VERSION:2.0"));
        assertTrue(ics.contains("BEGIN:VEVENT"));
        assertTrue(ics.contains("END:VEVENT"));
        assertTrue(ics.endsWith("END:VCALENDAR\r\n"));
    }

    @Test
    void generateCalendarFeed_shouldIncludeEventDetails() {
        // Given
        when(reservationRepository.findAll()).thenReturn(List.of(sampleReservation));

        // When
        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        // Then
        assertTrue(ics.contains("SUMMARY:Test Event"));
        assertTrue(ics.contains("LOCATION:Hubble"));
    }

    @Test
    void generateCalendarFeed_shouldFilterByStatus() {
        // Given
        Reservation confirmedReservation = createSampleReservation();
        confirmedReservation.setStatus(ReservationStatus.CONFIRMED);

        Reservation pendingReservation = createSampleReservation();
        pendingReservation.setStatus(ReservationStatus.PENDING);
        pendingReservation.setEventTitle("Pending Event");

        when(reservationRepository.findAll()).thenReturn(Arrays.asList(confirmedReservation, pendingReservation));

        // When
        String ics = iCalendarService.generateCalendarFeed(
            List.of(ReservationStatus.CONFIRMED), null, false
        );

        // Then
        assertTrue(ics.contains("Test Event"));
        assertFalse(ics.contains("Pending Event"));
    }

    @Test
    void generateCalendarFeed_shouldFilterByLocation() {
        // Given
        Reservation hubbleReservation = createSampleReservation();
        hubbleReservation.setLocation(BarLocation.HUBBLE);

        Reservation meteorReservation = createSampleReservation();
        meteorReservation.setLocation(BarLocation.METEOR);
        meteorReservation.setEventTitle("Meteor Event");

        when(reservationRepository.findAll()).thenReturn(Arrays.asList(hubbleReservation, meteorReservation));

        // When
        String ics = iCalendarService.generateCalendarFeed(null, "HUBBLE", false);

        // Then
        assertTrue(ics.contains("Test Event"));
        assertFalse(ics.contains("Meteor Event"));
    }

    @Test
    void generateCalendarFeed_shouldIncludeConfidentialDetailsWhenRequested() {
        // Given
        sampleReservation.setEmail("test@example.com");
        sampleReservation.setPhoneNumber("+31612345678");
        when(reservationRepository.findAll()).thenReturn(List.of(sampleReservation));

        // When
        String icsWithDetails = iCalendarService.generateCalendarFeed(null, null, true);
        String icsWithoutDetails = iCalendarService.generateCalendarFeed(null, null, false);

        // Then
        assertTrue(icsWithDetails.contains("test@example.com"));
        assertTrue(icsWithDetails.contains("+31612345678"));
        assertFalse(icsWithoutDetails.contains("test@example.com"));
        assertFalse(icsWithoutDetails.contains("+31612345678"));
    }

    @Test
    void generateCalendarFeed_shouldReturnEmptyCalendarWhenNoReservations() {
        // Given
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());

        // When
        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        // Then
        assertNotNull(ics);
        assertTrue(ics.startsWith("BEGIN:VCALENDAR"));
        assertTrue(ics.endsWith("END:VCALENDAR\r\n"));
        assertFalse(ics.contains("BEGIN:VEVENT"));
    }

    @Test
    void generateUpcomingCalendarFeed_shouldOnlyIncludeFutureEvents() {
        // Given
        Reservation futureReservation = createSampleReservation();
        futureReservation.setEventDate(LocalDate.now().plusDays(7));
        futureReservation.setEventTitle("Future Event");

        Reservation pastReservation = createSampleReservation();
        pastReservation.setEventDate(LocalDate.now().minusDays(7));
        pastReservation.setEventTitle("Past Event");

        when(reservationRepository.findAll()).thenReturn(Arrays.asList(futureReservation, pastReservation));

        // When
        String ics = iCalendarService.generateUpcomingCalendarFeed(null, null, false);

        // Then
        assertTrue(ics.contains("Future Event"));
        assertFalse(ics.contains("Past Event"));
    }

    private Reservation createSampleReservation() {
        Reservation reservation = new Reservation();
        reservation.setId(1L);
        reservation.setEventTitle("Test Event");
        reservation.setContactName("John Doe");
        reservation.setEmail("john@example.com");
        reservation.setPhoneNumber("+31612345678");
        reservation.setEventDate(LocalDate.now().plusDays(7));
        reservation.setStartTime(LocalTime.of(14, 0));
        reservation.setEndTime(LocalTime.of(17, 0));
        reservation.setLocation(BarLocation.HUBBLE);
        reservation.setExpectedGuests(20);
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setConfirmationNumber("ABC123");
        return reservation;
    }
}

