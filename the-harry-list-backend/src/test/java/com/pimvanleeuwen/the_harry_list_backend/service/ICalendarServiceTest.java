package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.repository.CalendarAppointmentRepository;
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

    @Mock
    private CalendarAppointmentRepository calendarAppointmentRepository;

    @InjectMocks
    private ICalendarService iCalendarService;

    private Reservation sampleReservation;

    @BeforeEach
    void setUp() {
        sampleReservation = createSampleReservation();
        // Default: no appointments (existing tests should not be affected). Lenient because the
        // catering-only path short-circuits and never queries the appointment repository.
        lenient().when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(Collections.emptyList());
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

    // ===== Catering Filter Tests =====

    @Test
    void generateCalendarFeed_shouldDefaultToAllWhenCateringNull() {
        Reservation cateringReservation = createCateringReservation();
        when(reservationRepository.findAll()).thenReturn(Arrays.asList(sampleReservation, cateringReservation));

        // catering = null => no catering filtering (backward compatible)
        String ics = iCalendarService.generateCalendarFeed(null, null, null, false);

        assertTrue(ics.contains("Test Event"));
        assertTrue(ics.contains("Catering Event"));
    }

    @Test
    void generateCalendarFeed_shouldFilterCateringOnly() {
        Reservation cateringReservation = createCateringReservation();
        when(reservationRepository.findAll()).thenReturn(Arrays.asList(sampleReservation, cateringReservation));

        String ics = iCalendarService.generateCalendarFeed(null, null, true, false);

        assertTrue(ics.contains("Catering Event"));
        assertFalse(ics.contains("Test Event"));
    }

    @Test
    void generateCalendarFeed_shouldFilterNonCateringOnly() {
        Reservation cateringReservation = createCateringReservation();
        when(reservationRepository.findAll()).thenReturn(Arrays.asList(sampleReservation, cateringReservation));

        String ics = iCalendarService.generateCalendarFeed(null, null, false, false);

        assertTrue(ics.contains("Test Event"));
        assertFalse(ics.contains("Catering Event"));
    }

    @Test
    void generateCalendarFeed_shouldExcludeAppointmentsWhenCateringOnly() {
        // Appointments have no catering attribute => treated as non-catering => dropped from a catering-only feed
        Reservation cateringReservation = createCateringReservation();
        CalendarAppointment appointment = createSampleAppointment();
        when(reservationRepository.findAll()).thenReturn(List.of(cateringReservation));
        // Lenient: catering-only short-circuits before the appointment repo is queried — that
        // early exit is precisely the behaviour under test (appointments never reach the feed).
        lenient().when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appointment));

        String ics = iCalendarService.generateCalendarFeed(null, null, true, false);

        assertTrue(ics.contains("Catering Event"));
        assertFalse(ics.contains("Staff Meeting"));
    }

    @Test
    void generateCalendarFeed_shouldIncludeAppointmentsWhenNonCateringOnly() {
        // Appointments count as non-catering, so they stay in a non-catering feed
        Reservation cateringReservation = createCateringReservation();
        CalendarAppointment appointment = createSampleAppointment();
        when(reservationRepository.findAll()).thenReturn(Arrays.asList(sampleReservation, cateringReservation));
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appointment));

        String ics = iCalendarService.generateCalendarFeed(null, null, false, false);

        assertTrue(ics.contains("Test Event"));
        assertTrue(ics.contains("Staff Meeting"));
        assertFalse(ics.contains("Catering Event"));
    }

    @Test
    void generateCalendarFeed_shouldCombineLocationAndCateringFilters() {
        // Hubble catering (should match), Meteor catering (wrong location), Hubble non-catering (wrong catering)
        Reservation hubbleCatering = createCateringReservation();
        hubbleCatering.setLocation(BarLocation.HUBBLE);

        Reservation meteorCatering = createCateringReservation();
        meteorCatering.setLocation(BarLocation.METEOR);
        meteorCatering.setEventTitle("Meteor Catering Event");

        Reservation hubbleNonCatering = createSampleReservation();
        hubbleNonCatering.setLocation(BarLocation.HUBBLE);
        hubbleNonCatering.setEventTitle("Hubble Plain Event");

        when(reservationRepository.findAll()).thenReturn(Arrays.asList(hubbleCatering, meteorCatering, hubbleNonCatering));

        String ics = iCalendarService.generateCalendarFeed(null, "HUBBLE", true, false);

        assertTrue(ics.contains("Catering Event"));
        assertFalse(ics.contains("Meteor Catering Event"));
        assertFalse(ics.contains("Hubble Plain Event"));
    }

    @Test
    void generateUpcomingCalendarFeed_shouldApplyCateringFilter() {
        Reservation futureCatering = createCateringReservation();
        futureCatering.setEventDate(LocalDate.now().plusDays(5));

        Reservation futurePlain = createSampleReservation();
        futurePlain.setEventDate(LocalDate.now().plusDays(5));
        futurePlain.setEventTitle("Future Plain Event");

        when(reservationRepository.findAll()).thenReturn(Arrays.asList(futureCatering, futurePlain));

        String ics = iCalendarService.generateUpcomingCalendarFeed(null, null, true, false);

        assertTrue(ics.contains("Catering Event"));
        assertFalse(ics.contains("Future Plain Event"));
    }

    // ===== Calendar Appointment Tests =====

    @Test
    void generateCalendarFeed_shouldIncludeAppointments() {
        CalendarAppointment appointment = createSampleAppointment();
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appointment));

        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        assertTrue(ics.contains("BEGIN:VEVENT"));
        assertTrue(ics.contains("UID:appointment-1@harrylist.hubble.cafe"));
        assertTrue(ics.contains("SUMMARY:Staff Meeting"));
        assertTrue(ics.contains("LOCATION:Hubble Community Caf"));
    }

    @Test
    void generateCalendarFeed_shouldRenderAllDayAppointments() {
        CalendarAppointment appointment = CalendarAppointment.builder()
                .id(2L)
                .title("Holiday Closure")
                .date(LocalDate.of(2026, 12, 25))
                .allDay(true)
                .location(BarLocation.METEOR)
                .recurrenceType(RecurrenceType.NONE)
                .enabled(true)
                .build();
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appointment));

        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        assertTrue(ics.contains("DTSTART;VALUE=DATE:20261225"));
        assertTrue(ics.contains("DTEND;VALUE=DATE:20261226"));
        assertFalse(ics.contains("DTSTART;TZID="));
    }

    @Test
    void generateCalendarFeed_shouldRenderTimeboxedAppointments() {
        CalendarAppointment appointment = createSampleAppointment();
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appointment));

        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        assertTrue(ics.contains("DTSTART;TZID=Europe/Amsterdam:20260601T100000"));
        assertTrue(ics.contains("DTEND;TZID=Europe/Amsterdam:20260601T110000"));
        assertFalse(ics.contains("DTSTART;VALUE=DATE:"));
    }

    @Test
    void generateCalendarFeed_shouldFilterAppointmentsByLocation() {
        CalendarAppointment hubbleAppt = createSampleAppointment();
        CalendarAppointment meteorAppt = CalendarAppointment.builder()
                .id(2L)
                .title("Meteor Event")
                .date(LocalDate.of(2026, 6, 1))
                .allDay(false)
                .startTime(LocalTime.of(14, 0))
                .endTime(LocalTime.of(15, 0))
                .location(BarLocation.METEOR)
                .recurrenceType(RecurrenceType.NONE)
                .enabled(true)
                .build();
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(hubbleAppt, meteorAppt));

        String ics = iCalendarService.generateCalendarFeed(null, "HUBBLE", false);

        assertTrue(ics.contains("Staff Meeting"));
        assertFalse(ics.contains("Meteor Event"));
    }

    @Test
    void generateCalendarFeed_shouldIncludeRruleForRecurring() {
        CalendarAppointment appointment = createSampleAppointment(); // WEEKLY with end date
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appointment));

        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        assertTrue(ics.contains("RRULE:FREQ=WEEKLY;UNTIL=20261231T235959"));
    }

    @Test
    void generateCalendarFeed_shouldIncludeRruleForYearly() {
        CalendarAppointment appointment = CalendarAppointment.builder()
                .id(3L)
                .title("Annual Review")
                .date(LocalDate.of(2026, 1, 15))
                .allDay(true)
                .location(BarLocation.HUBBLE)
                .recurrenceType(RecurrenceType.YEARLY)
                .enabled(true)
                .build();
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appointment));

        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        assertTrue(ics.contains("RRULE:FREQ=YEARLY"));
    }

    @Test
    void generateCalendarFeed_shouldIncludeRruleForEveryTwoWeeks() {
        // "Every 2 weeks" is now expressed as WEEKLY with interval 2 (BIWEEKLY retired).
        CalendarAppointment appointment = CalendarAppointment.builder()
                .id(4L)
                .title("Fortnightly Sync")
                .date(LocalDate.of(2026, 6, 1))
                .allDay(false)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(10, 0))
                .location(BarLocation.HUBBLE)
                .recurrenceType(RecurrenceType.WEEKLY)
                .recurrenceInterval(2)
                .enabled(true)
                .build();
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appointment));

        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        assertTrue(ics.contains("RRULE:FREQ=WEEKLY;INTERVAL=2"));
    }

    @Test
    void generateCalendarFeed_shouldIncludeIntervalForEveryNWeeks() {
        CalendarAppointment appointment = CalendarAppointment.builder()
                .id(7L)
                .title("Every Three Weeks")
                .date(LocalDate.of(2026, 6, 1))
                .allDay(false)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(10, 0))
                .location(BarLocation.HUBBLE)
                .recurrenceType(RecurrenceType.WEEKLY)
                .recurrenceInterval(3)
                .enabled(true)
                .build();
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appointment));

        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        assertTrue(ics.contains("RRULE:FREQ=WEEKLY;INTERVAL=3"));
    }

    @Test
    void generateCalendarFeed_shouldIncludeRruleForNthWeekdayOfMonth() {
        CalendarAppointment appointment = CalendarAppointment.builder()
                .id(8L)
                .title("Second Friday Meetup")
                .date(LocalDate.of(2026, 6, 12)) // a 2nd Friday
                .allDay(false)
                .startTime(LocalTime.of(18, 0))
                .endTime(LocalTime.of(20, 0))
                .location(BarLocation.HUBBLE)
                .recurrenceType(RecurrenceType.MONTHLY_NTH_WEEKDAY)
                .recurrenceWeekOfMonth(2)
                .recurrenceDayOfWeek(java.time.DayOfWeek.FRIDAY)
                .recurrenceEndDate(LocalDate.of(2026, 12, 31))
                .enabled(true)
                .build();
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appointment));

        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        assertTrue(ics.contains("RRULE:FREQ=MONTHLY;BYDAY=2FR;UNTIL=20261231T235959"));
    }

    @Test
    void generateCalendarFeed_shouldRenderLastWeekdayOfMonth() {
        CalendarAppointment appointment = CalendarAppointment.builder()
                .id(9L)
                .title("Last Monday Cleanup")
                .date(LocalDate.of(2026, 6, 29))
                .allDay(true)
                .location(BarLocation.METEOR)
                .recurrenceType(RecurrenceType.MONTHLY_NTH_WEEKDAY)
                .recurrenceWeekOfMonth(-1)
                .recurrenceDayOfWeek(java.time.DayOfWeek.MONDAY)
                .enabled(true)
                .build();
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appointment));

        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        assertTrue(ics.contains("RRULE:FREQ=MONTHLY;BYDAY=-1MO"));
    }

    @Test
    void generateCalendarFeed_shouldHonourIntervalForNthWeekday() {
        CalendarAppointment appointment = CalendarAppointment.builder()
                .id(10L)
                .title("Every Other Month, First Tuesday")
                .date(LocalDate.of(2026, 6, 2))
                .allDay(true)
                .location(BarLocation.HUBBLE)
                .recurrenceType(RecurrenceType.MONTHLY_NTH_WEEKDAY)
                .recurrenceInterval(2)
                .recurrenceWeekOfMonth(1)
                .recurrenceDayOfWeek(java.time.DayOfWeek.TUESDAY)
                .enabled(true)
                .build();
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appointment));

        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        assertTrue(ics.contains("RRULE:FREQ=MONTHLY;INTERVAL=2;BYDAY=1TU"));
    }

    @Test
    void generateCalendarFeed_shouldOmitRruleForIncompleteNthWeekday() {
        // Missing day-of-week => no valid BYDAY can be built; emit no RRULE rather than invalid iCal
        CalendarAppointment appointment = CalendarAppointment.builder()
                .id(11L)
                .title("Incomplete Nth Weekday")
                .date(LocalDate.of(2026, 6, 1))
                .allDay(true)
                .location(BarLocation.HUBBLE)
                .recurrenceType(RecurrenceType.MONTHLY_NTH_WEEKDAY)
                .recurrenceWeekOfMonth(2)
                .enabled(true)
                .build();
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appointment));

        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        assertTrue(ics.contains("SUMMARY:Incomplete Nth Weekday"));
        // VTIMEZONE legitimately contains RRULE lines, so assert no *event* monthly rule was emitted
        assertFalse(ics.contains("RRULE:FREQ=MONTHLY"));
    }

    @Test
    void generateCalendarFeed_shouldExcludeDisabledAppointments() {
        // findByEnabledTrue() already filters, so an empty result means disabled ones are excluded
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(Collections.emptyList());

        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        assertFalse(ics.contains("appointment-"));
    }

    @Test
    void generateUpcomingCalendarFeed_shouldExcludePastAppointments() {
        CalendarAppointment pastAppt = CalendarAppointment.builder()
                .id(5L)
                .title("Past Event")
                .date(LocalDate.now().minusDays(7))
                .allDay(true)
                .location(BarLocation.HUBBLE)
                .recurrenceType(RecurrenceType.NONE)
                .enabled(true)
                .build();
        CalendarAppointment futureAppt = CalendarAppointment.builder()
                .id(6L)
                .title("Future Event")
                .date(LocalDate.now().plusDays(7))
                .allDay(true)
                .location(BarLocation.HUBBLE)
                .recurrenceType(RecurrenceType.NONE)
                .enabled(true)
                .build();
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(pastAppt, futureAppt));

        String ics = iCalendarService.generateUpcomingCalendarFeed(null, null, false);

        assertFalse(ics.contains("Past Event"));
        assertTrue(ics.contains("Future Event"));
    }

    @Test
    void generateCalendarFeed_shouldIncludeAppointmentDescription() {
        CalendarAppointment appointment = createSampleAppointment();
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appointment));

        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        assertTrue(ics.contains("DESCRIPTION:Weekly team sync"));
    }

    @Test
    void generateCalendarFeed_shouldIncludeAppointmentCategories() {
        CalendarAppointment appointment = createSampleAppointment();
        when(reservationRepository.findAll()).thenReturn(Collections.emptyList());
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appointment));

        String ics = iCalendarService.generateCalendarFeed(null, null, false);

        assertTrue(ics.contains("CATEGORIES:Hubble Community Caf"));
        assertTrue(ics.contains(",Appointment"));
    }

    private CalendarAppointment createSampleAppointment() {
        return CalendarAppointment.builder()
                .id(1L)
                .title("Staff Meeting")
                .description("Weekly team sync")
                .date(LocalDate.of(2026, 6, 1))
                .allDay(false)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .location(BarLocation.HUBBLE)
                .recurrenceType(RecurrenceType.WEEKLY)
                .recurrenceEndDate(LocalDate.of(2026, 12, 31))
                .enabled(true)
                .build();
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

    private Reservation createCateringReservation() {
        Reservation reservation = createSampleReservation();
        reservation.setId(2L);
        reservation.setEventTitle("Catering Event");
        reservation.setSpecialActivities(java.util.Set.of(SpecialActivity.EAT_CATERING));
        return reservation;
    }
}

