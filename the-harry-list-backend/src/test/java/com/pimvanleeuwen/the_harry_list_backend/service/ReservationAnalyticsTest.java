package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Boundary tests for the PII-free analytics bucket logic. Each bucket edge is pinned so a
 * future tweak to the thresholds can't silently drift the Loki dashboards.
 */
class ReservationAnalyticsTest {

    // ---- bar ----

    @Test
    void bar_usesLocationNameAndFallsBackToNoPreference() {
        assertEquals("HUBBLE", ReservationAnalytics.bar(BarLocation.HUBBLE));
        assertEquals("METEOR", ReservationAnalytics.bar(BarLocation.METEOR));
        assertEquals("NO_PREFERENCE", ReservationAnalytics.bar(BarLocation.NO_PREFERENCE));
        assertEquals("NO_PREFERENCE", ReservationAnalytics.bar(null));
    }

    // ---- day of week (ISO Mon=1 … Sun=7) ----

    @Test
    void dayOfWeek_labelsEachWeekday() {
        // Week of Mon 2026-03-16 … Sun 2026-03-22.
        assertEquals("1_Mon", ReservationAnalytics.dayOfWeek(LocalDate.of(2026, 3, 16)));
        assertEquals("2_Tue", ReservationAnalytics.dayOfWeek(LocalDate.of(2026, 3, 17)));
        assertEquals("3_Wed", ReservationAnalytics.dayOfWeek(LocalDate.of(2026, 3, 18)));
        assertEquals("4_Thu", ReservationAnalytics.dayOfWeek(LocalDate.of(2026, 3, 19)));
        assertEquals("5_Fri", ReservationAnalytics.dayOfWeek(LocalDate.of(2026, 3, 20)));
        assertEquals("6_Sat", ReservationAnalytics.dayOfWeek(LocalDate.of(2026, 3, 21)));
        assertEquals("7_Sun", ReservationAnalytics.dayOfWeek(LocalDate.of(2026, 3, 22)));
    }

    // ---- slot ----

    @Test
    void slot_boundaries() {
        assertEquals("1_morning", ReservationAnalytics.slot(LocalTime.of(0, 0)));
        assertEquals("1_morning", ReservationAnalytics.slot(LocalTime.of(11, 59)));
        assertEquals("2_afternoon", ReservationAnalytics.slot(LocalTime.of(12, 0)));
        assertEquals("2_afternoon", ReservationAnalytics.slot(LocalTime.of(16, 59)));
        assertEquals("3_evening", ReservationAnalytics.slot(LocalTime.of(17, 0)));
        assertEquals("3_evening", ReservationAnalytics.slot(LocalTime.of(21, 59)));
        assertEquals("4_night", ReservationAnalytics.slot(LocalTime.of(22, 0)));
        assertEquals("4_night", ReservationAnalytics.slot(LocalTime.of(23, 59)));
    }

    // ---- guests ----

    @Test
    void guests_boundaries() {
        assertEquals("1_lt20", ReservationAnalytics.guests(null));
        assertEquals("1_lt20", ReservationAnalytics.guests(0));
        assertEquals("1_lt20", ReservationAnalytics.guests(19));
        assertEquals("2_20_50", ReservationAnalytics.guests(20));
        assertEquals("2_20_50", ReservationAnalytics.guests(49));
        assertEquals("3_50_100", ReservationAnalytics.guests(50));
        assertEquals("3_50_100", ReservationAnalytics.guests(99));
        assertEquals("4_gte100", ReservationAnalytics.guests(100));
        assertEquals("4_gte100", ReservationAnalytics.guests(500));
    }

    // ---- lead ----

    @Test
    void lead_boundaries() {
        LocalDateTime bookedOn = LocalDateTime.of(2026, 3, 1, 10, 0);
        assertEquals("1_same_week", ReservationAnalytics.lead(bookedOn, LocalDate.of(2026, 3, 1)));  // 0 days
        assertEquals("1_same_week", ReservationAnalytics.lead(bookedOn, LocalDate.of(2026, 3, 7)));  // 6 days
        assertEquals("2_wk1_2", ReservationAnalytics.lead(bookedOn, LocalDate.of(2026, 3, 8)));      // 7 days
        assertEquals("2_wk1_2", ReservationAnalytics.lead(bookedOn, LocalDate.of(2026, 3, 14)));     // 13 days
        assertEquals("3_wk3_4", ReservationAnalytics.lead(bookedOn, LocalDate.of(2026, 3, 15)));     // 14 days
        assertEquals("3_wk3_4", ReservationAnalytics.lead(bookedOn, LocalDate.of(2026, 3, 28)));     // 27 days
        assertEquals("4_gt_4wk", ReservationAnalytics.lead(bookedOn, LocalDate.of(2026, 3, 29)));    // 28 days
    }

    @Test
    void lead_clampsNegativesToSameWeek() {
        LocalDateTime bookedOn = LocalDateTime.of(2026, 3, 10, 10, 0);
        assertEquals("1_same_week", ReservationAnalytics.lead(bookedOn, LocalDate.of(2026, 3, 5))); // -5 days
    }

    @Test
    void lead_fallsBackToNowWhenCreatedAtIsNull() {
        assertEquals("1_same_week", ReservationAnalytics.lead(null, LocalDate.now()));
        assertEquals("4_gt_4wk", ReservationAnalytics.lead(null, LocalDate.now().plusDays(40)));
    }

    // ---- full lines ----

    @Test
    void reservationCreatedLine_assemblesAllBuckets() {
        Reservation r = new Reservation();
        r.setLocation(BarLocation.HUBBLE);
        r.setEventDate(LocalDate.of(2026, 3, 15));      // Sunday
        r.setStartTime(LocalTime.of(16, 0));            // afternoon
        r.setExpectedGuests(50);                        // 50_100
        r.setCreatedAt(LocalDateTime.of(2026, 3, 1, 10, 0)); // 14 days -> wk3_4

        assertEquals(
                "APP_ANALYTICS event=reservation_created bar=HUBBLE dow=7_Sun slot=2_afternoon guests=3_50_100 lead=3_wk3_4",
                ReservationAnalytics.reservationCreatedLine(r));
    }

    @Test
    void reservationStatusChangedLine_hasStatusAndBar() {
        assertEquals("APP_ANALYTICS event=reservation_status_changed status=CONFIRMED bar=HUBBLE",
                ReservationAnalytics.reservationStatusChangedLine(ReservationStatus.CONFIRMED, BarLocation.HUBBLE));
        // Null location (e.g. a rejected NO_PREFERENCE request) falls back to NO_PREFERENCE.
        assertEquals("APP_ANALYTICS event=reservation_status_changed status=REJECTED bar=NO_PREFERENCE",
                ReservationAnalytics.reservationStatusChangedLine(ReservationStatus.REJECTED, null));
    }
}
