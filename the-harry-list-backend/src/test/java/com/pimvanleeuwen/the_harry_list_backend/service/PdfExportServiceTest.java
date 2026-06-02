package com.pimvanleeuwen.the_harry_list_backend.service;

import org.openpdf.text.DocumentException;
import org.openpdf.text.pdf.PdfReader;
import org.openpdf.text.pdf.parser.PdfTextExtractor;
import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.model.SpecialActivity;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Unit tests for PdfExportService, focusing on the reservation filtering logic
 * (confirmed-only and catering-only) applied before rendering the daily report.
 */
@ExtendWith(MockitoExtension.class)
class PdfExportServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @InjectMocks
    private PdfExportService pdfExportService;

    private static final LocalDate REPORT_DATE = LocalDate.of(2026, 2, 15);

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

    // --- helpers ---

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
