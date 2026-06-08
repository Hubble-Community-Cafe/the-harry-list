package com.pimvanleeuwen.the_harry_list_backend.service;

import org.openpdf.text.pdf.PdfReader;
import org.openpdf.text.pdf.parser.PdfTextExtractor;
import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.CalendarAppointment;
import com.pimvanleeuwen.the_harry_list_backend.model.RecurrenceType;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.model.SpecialActivity;
import com.pimvanleeuwen.the_harry_list_backend.repository.CalendarAppointmentRepository;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Unit tests for PdfExportService, focusing on the reservation filtering logic
 * (confirmed-only and catering-only) applied before rendering the daily report.
 */
@ExtendWith(MockitoExtension.class)
class PdfExportServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private CalendarAppointmentRepository calendarAppointmentRepository;

    private PdfExportService pdfExportService;

    private static final LocalDate REPORT_DATE = LocalDate.of(2026, 2, 15);

    @BeforeEach
    void setUp() {
        // Uses the real recurrence resolver — its behaviour is covered by its own unit test.
        pdfExportService = new PdfExportService(
                reservationRepository,
                calendarAppointmentRepository,
                new AppointmentRecurrenceService());
        // Most reservation-focused tests have no appointments; appointment tests override this.
        lenient().when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of());
    }

    @Test
    void generateDailyReport_cateringOnly_includesOnlyCateringReservations() throws Exception {
        // Given: one catering reservation and one non-catering reservation on the same day/location
        Reservation catering = reservation("Catering Dinner", LocalTime.of(18, 0),
                ReservationStatus.CONFIRMED, Set.of(SpecialActivity.EAT_CATERING));
        Reservation nonCatering = reservation("Plain Drinks", LocalTime.of(20, 0),
                ReservationStatus.CONFIRMED, Set.of(SpecialActivity.PRIVATE_EVENT));
        when(reservationRepository.findAll()).thenReturn(List.of(catering, nonCatering));

        // When
        byte[] pdf = pdfExportService.generateDailyReport(REPORT_DATE, BarLocation.HUBBLE, false, true);

        // Then: only the catering reservation appears
        String text = extractText(pdf);
        assertTrue(text.contains("Catering Dinner"), "Catering reservation should be included");
        assertFalse(text.contains("Plain Drinks"), "Non-catering reservation should be excluded");
    }

    @Test
    void generateDailyReport_cateringOnlyFalse_includesAllReservations() throws Exception {
        // Given
        Reservation catering = reservation("Catering Dinner", LocalTime.of(18, 0),
                ReservationStatus.CONFIRMED, Set.of(SpecialActivity.EAT_A_LA_CARTE));
        Reservation nonCatering = reservation("Plain Drinks", LocalTime.of(20, 0),
                ReservationStatus.CONFIRMED, Set.of(SpecialActivity.PRIVATE_EVENT));
        when(reservationRepository.findAll()).thenReturn(List.of(catering, nonCatering));

        // When
        byte[] pdf = pdfExportService.generateDailyReport(REPORT_DATE, BarLocation.HUBBLE, false, false);

        // Then: both reservations appear
        String text = extractText(pdf);
        assertTrue(text.contains("Catering Dinner"));
        assertTrue(text.contains("Plain Drinks"));
    }

    @Test
    void generateDailyReport_cateringOnly_recognisesAllCateringActivities() throws Exception {
        // Given: each of the three catering activities should qualify
        Reservation alaCarte = reservation("A La Carte Lunch", LocalTime.of(12, 0),
                ReservationStatus.CONFIRMED, Set.of(SpecialActivity.EAT_A_LA_CARTE));
        Reservation cateringEvent = reservation("Full Catering", LocalTime.of(15, 0),
                ReservationStatus.CONFIRMED, Set.of(SpecialActivity.EAT_CATERING));
        Reservation coronaRoom = reservation("Corona Room Catering", LocalTime.of(17, 0),
                ReservationStatus.CONFIRMED, Set.of(SpecialActivity.CATERING_CORONA_ROOM));
        Reservation graduation = reservation("Graduation Only", LocalTime.of(19, 0),
                ReservationStatus.CONFIRMED, Set.of(SpecialActivity.GRADUATION));
        when(reservationRepository.findAll())
                .thenReturn(List.of(alaCarte, cateringEvent, coronaRoom, graduation));

        // When
        byte[] pdf = pdfExportService.generateDailyReport(REPORT_DATE, BarLocation.HUBBLE, false, true);

        // Then
        String text = extractText(pdf);
        assertTrue(text.contains("A La Carte Lunch"));
        assertTrue(text.contains("Full Catering"));
        assertTrue(text.contains("Corona Room Catering"));
        assertFalse(text.contains("Graduation Only"), "Non-catering activity should be excluded");
    }

    @Test
    void generateDailyReport_cateringOnly_combinesWithConfirmedOnly() throws Exception {
        // Given: a confirmed catering reservation and a pending catering reservation
        Reservation confirmedCatering = reservation("Confirmed Catering", LocalTime.of(18, 0),
                ReservationStatus.CONFIRMED, Set.of(SpecialActivity.EAT_CATERING));
        Reservation pendingCatering = reservation("Pending Catering", LocalTime.of(20, 0),
                ReservationStatus.PENDING, Set.of(SpecialActivity.EAT_CATERING));
        when(reservationRepository.findAll()).thenReturn(List.of(confirmedCatering, pendingCatering));

        // When: both filters active
        byte[] pdf = pdfExportService.generateDailyReport(REPORT_DATE, BarLocation.HUBBLE, true, true);

        // Then: only the confirmed catering reservation remains
        String text = extractText(pdf);
        assertTrue(text.contains("Confirmed Catering"));
        assertFalse(text.contains("Pending Catering"));
    }

    @Test
    void generateDailyReport_cateringOnly_withNoMatches_producesEmptyReport() throws Exception {
        // Given: only non-catering reservations
        Reservation nonCatering = reservation("Plain Drinks", LocalTime.of(20, 0),
                ReservationStatus.CONFIRMED, Set.of(SpecialActivity.PRIVATE_EVENT));
        when(reservationRepository.findAll()).thenReturn(List.of(nonCatering));

        // When
        byte[] pdf = pdfExportService.generateDailyReport(REPORT_DATE, BarLocation.HUBBLE, false, true);

        // Then: a valid PDF is still produced with the "no reservations" message
        assertNotNull(pdf);
        assertTrue(pdf.length > 0);
        String text = extractText(pdf);
        assertTrue(text.contains("No reservations for this date."));
        assertFalse(text.contains("Plain Drinks"));
    }

    // --- appointment rendering ---

    @Test
    void generateDailyReport_includesAppointmentsForTheDateAndLocation() throws Exception {
        // Given: a reservation and an appointment on the report date/location
        Reservation res = reservation("Evening Drinks", LocalTime.of(20, 0),
                ReservationStatus.CONFIRMED, Set.of(SpecialActivity.PRIVATE_EVENT));
        when(reservationRepository.findAll()).thenReturn(List.of(res));
        CalendarAppointment appt = appointment("Staff Meeting", "Discuss the roster",
                LocalTime.of(9, 0), LocalTime.of(10, 0), BarLocation.HUBBLE);
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appt));

        // When
        byte[] pdf = pdfExportService.generateDailyReport(REPORT_DATE, BarLocation.HUBBLE, false, false);

        // Then: the appointments page lists the appointment, and the reservation still appears
        String text = extractText(pdf);
        assertTrue(text.contains("Appointments for"), "Appointments section heading should appear");
        assertTrue(text.contains("Staff Meeting"));
        assertTrue(text.contains("Discuss the roster"));
        assertTrue(text.contains("09:00 - 10:00"));
        assertTrue(text.contains("Evening Drinks"));
    }

    @Test
    void generateDailyReport_excludesAppointmentsForOtherLocations() throws Exception {
        when(reservationRepository.findAll()).thenReturn(List.of());
        CalendarAppointment meteorAppt = appointment("Meteor Only", null,
                LocalTime.of(9, 0), LocalTime.of(10, 0), BarLocation.METEOR);
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(meteorAppt));

        // When: exporting the HUBBLE report
        byte[] pdf = pdfExportService.generateDailyReport(REPORT_DATE, BarLocation.HUBBLE, false, false);

        // Then: the Meteor appointment is not shown and no appointments heading appears
        String text = extractText(pdf);
        assertFalse(text.contains("Meteor Only"));
        assertFalse(text.contains("Appointments for"));
    }

    @Test
    void generateDailyReport_excludesAppointmentsNotOccurringOnTheDate() throws Exception {
        when(reservationRepository.findAll()).thenReturn(List.of());
        // A one-off appointment on a different day
        CalendarAppointment otherDay = appointment("Other Day", null,
                LocalTime.of(9, 0), LocalTime.of(10, 0), BarLocation.HUBBLE);
        otherDay.setDate(REPORT_DATE.plusDays(1));
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(otherDay));

        byte[] pdf = pdfExportService.generateDailyReport(REPORT_DATE, BarLocation.HUBBLE, false, false);

        String text = extractText(pdf);
        assertFalse(text.contains("Other Day"));
    }

    @Test
    void generateDailyReport_includesRecurringAppointmentOnAnOccurrence() throws Exception {
        when(reservationRepository.findAll()).thenReturn(List.of());
        // Weekly appointment starting two weeks before the report date — should recur onto it
        CalendarAppointment weekly = appointment("Weekly Standup", null,
                LocalTime.of(9, 0), LocalTime.of(9, 30), BarLocation.HUBBLE);
        weekly.setDate(REPORT_DATE.minusWeeks(2));
        weekly.setRecurrenceType(RecurrenceType.WEEKLY);
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(weekly));

        byte[] pdf = pdfExportService.generateDailyReport(REPORT_DATE, BarLocation.HUBBLE, false, false);

        String text = extractText(pdf);
        assertTrue(text.contains("Weekly Standup"));
    }

    @Test
    void generateDailyReport_showsAppointmentsEvenWithConfirmedAndCateringOnlyFilters() throws Exception {
        // Given: no reservations match, but an appointment exists. The filters only apply to
        // reservations, so the appointment must still appear.
        when(reservationRepository.findAll()).thenReturn(List.of());
        CalendarAppointment appt = appointment("Always Visible", null,
                LocalTime.of(8, 0), null, BarLocation.HUBBLE);
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(appt));

        byte[] pdf = pdfExportService.generateDailyReport(REPORT_DATE, BarLocation.HUBBLE, true, true);

        String text = extractText(pdf);
        assertTrue(text.contains("Always Visible"));
    }

    @Test
    void generateDailyReport_rendersAllDayAppointmentTime() throws Exception {
        when(reservationRepository.findAll()).thenReturn(List.of());
        CalendarAppointment allDay = appointment("Closed for Holiday", null, null, null, BarLocation.HUBBLE);
        allDay.setAllDay(true);
        when(calendarAppointmentRepository.findByEnabledTrue()).thenReturn(List.of(allDay));

        byte[] pdf = pdfExportService.generateDailyReport(REPORT_DATE, BarLocation.HUBBLE, false, false);

        String text = extractText(pdf);
        assertTrue(text.contains("Closed for Holiday"));
        assertTrue(text.contains("All day"));
    }

    // --- helpers ---

    private CalendarAppointment appointment(String title, String description, LocalTime start,
                                            LocalTime end, BarLocation location) {
        return CalendarAppointment.builder()
                .title(title)
                .description(description)
                .date(REPORT_DATE)
                .startTime(start)
                .endTime(end)
                .allDay(false)
                .location(location)
                .recurrenceType(RecurrenceType.NONE)
                .enabled(true)
                .build();
    }

    private Reservation reservation(String title, LocalTime start, ReservationStatus status,
                                    Set<SpecialActivity> activities) {
        Reservation r = new Reservation();
        r.setEventTitle(title);
        r.setContactName("Test Contact");
        r.setEmail("test@example.com");
        r.setEventDate(REPORT_DATE);
        r.setStartTime(start);
        r.setEndTime(start.plusHours(2));
        r.setLocation(BarLocation.HUBBLE);
        r.setExpectedGuests(10);
        r.setStatus(status);
        r.setSpecialActivities(activities);
        return r;
    }

    private String extractText(byte[] pdf) throws IOException {
        PdfReader reader = new PdfReader(pdf);
        PdfTextExtractor extractor = new PdfTextExtractor(reader);
        StringBuilder sb = new StringBuilder();
        for (int page = 1; page <= reader.getNumberOfPages(); page++) {
            sb.append(extractor.getTextFromPage(page)).append('\n');
        }
        reader.close();
        return sb.toString();
    }
}
