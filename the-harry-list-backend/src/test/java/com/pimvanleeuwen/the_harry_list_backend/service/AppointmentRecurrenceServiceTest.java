package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.CalendarAppointment;
import com.pimvanleeuwen.the_harry_list_backend.model.RecurrenceType;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit tests for {@link AppointmentRecurrenceService#occursOn}, mirroring the semantics
 * covered by the admin frontend's recurrence expander (recurrence.ts).
 */
class AppointmentRecurrenceServiceTest {

    private final AppointmentRecurrenceService service = new AppointmentRecurrenceService();

    private CalendarAppointment.CalendarAppointmentBuilder base(LocalDate date, RecurrenceType type) {
        return CalendarAppointment.builder()
                .title("Test")
                .date(date)
                .location(BarLocation.HUBBLE)
                .recurrenceType(type)
                .enabled(true);
    }

    // ── NONE ──────────────────────────────────────────────────────────────────

    @Test
    void none_occursOnlyOnItsOwnDate() {
        CalendarAppointment a = base(LocalDate.of(2030, 6, 8), RecurrenceType.NONE).build();
        assertTrue(service.occursOn(a, LocalDate.of(2030, 6, 8)));
        assertFalse(service.occursOn(a, LocalDate.of(2030, 6, 9)));
    }

    @Test
    void never_occursBeforeStartDate() {
        CalendarAppointment a = base(LocalDate.of(2030, 6, 8), RecurrenceType.DAILY).build();
        assertFalse(service.occursOn(a, LocalDate.of(2030, 6, 7)));
    }

    // ── DAILY ─────────────────────────────────────────────────────────────────

    @Test
    void daily_occursEveryDay() {
        CalendarAppointment a = base(LocalDate.of(2030, 6, 8), RecurrenceType.DAILY).build();
        assertTrue(service.occursOn(a, LocalDate.of(2030, 6, 8)));
        assertTrue(service.occursOn(a, LocalDate.of(2030, 6, 9)));
        assertTrue(service.occursOn(a, LocalDate.of(2030, 7, 1)));
    }

    @Test
    void daily_withInterval_occursEveryNthDay() {
        CalendarAppointment a = base(LocalDate.of(2030, 6, 8), RecurrenceType.DAILY)
                .recurrenceInterval(3).build();
        assertTrue(service.occursOn(a, LocalDate.of(2030, 6, 8)));
        assertFalse(service.occursOn(a, LocalDate.of(2030, 6, 9)));
        assertTrue(service.occursOn(a, LocalDate.of(2030, 6, 11))); // +3 days
    }

    // ── WEEKLY ────────────────────────────────────────────────────────────────

    @Test
    void weekly_occursOnSameWeekday() {
        CalendarAppointment a = base(LocalDate.of(2030, 6, 8), RecurrenceType.WEEKLY).build(); // Saturday
        assertTrue(service.occursOn(a, LocalDate.of(2030, 6, 8)));
        assertTrue(service.occursOn(a, LocalDate.of(2030, 6, 15)));
        assertFalse(service.occursOn(a, LocalDate.of(2030, 6, 14))); // Friday
    }

    @Test
    void weekly_withInterval_skipsOddWeeks() {
        CalendarAppointment a = base(LocalDate.of(2030, 6, 8), RecurrenceType.WEEKLY)
                .recurrenceInterval(2).build();
        assertTrue(service.occursOn(a, LocalDate.of(2030, 6, 8)));
        assertFalse(service.occursOn(a, LocalDate.of(2030, 6, 15))); // +1 week
        assertTrue(service.occursOn(a, LocalDate.of(2030, 6, 22)));  // +2 weeks
    }

    // ── MONTHLY ───────────────────────────────────────────────────────────────

    @Test
    void monthly_occursOnSameDayOfMonth() {
        CalendarAppointment a = base(LocalDate.of(2030, 6, 8), RecurrenceType.MONTHLY).build();
        assertTrue(service.occursOn(a, LocalDate.of(2030, 6, 8)));
        assertTrue(service.occursOn(a, LocalDate.of(2030, 7, 8)));
        assertFalse(service.occursOn(a, LocalDate.of(2030, 7, 9)));
    }

    @Test
    void monthly_withInterval_skipsMonths() {
        CalendarAppointment a = base(LocalDate.of(2030, 6, 8), RecurrenceType.MONTHLY)
                .recurrenceInterval(2).build();
        assertTrue(service.occursOn(a, LocalDate.of(2030, 6, 8)));
        assertFalse(service.occursOn(a, LocalDate.of(2030, 7, 8)));
        assertTrue(service.occursOn(a, LocalDate.of(2030, 8, 8)));
    }

    // ── YEARLY ────────────────────────────────────────────────────────────────

    @Test
    void yearly_occursOnSameMonthAndDay() {
        CalendarAppointment a = base(LocalDate.of(2030, 6, 8), RecurrenceType.YEARLY).build();
        assertTrue(service.occursOn(a, LocalDate.of(2031, 6, 8)));
        assertFalse(service.occursOn(a, LocalDate.of(2031, 6, 9)));
        assertFalse(service.occursOn(a, LocalDate.of(2031, 7, 8)));
    }

    // ── MONTHLY_NTH_WEEKDAY ───────────────────────────────────────────────────

    @Test
    void nthWeekday_occursOnSecondFriday() {
        // 2030-01-11 is the 2nd Friday of January 2030.
        CalendarAppointment a = base(LocalDate.of(2030, 1, 11), RecurrenceType.MONTHLY_NTH_WEEKDAY)
                .recurrenceWeekOfMonth(2)
                .recurrenceDayOfWeek(DayOfWeek.FRIDAY)
                .build();
        assertTrue(service.occursOn(a, LocalDate.of(2030, 1, 11)));
        assertTrue(service.occursOn(a, LocalDate.of(2030, 2, 8)));  // 2nd Friday of Feb 2030
        assertFalse(service.occursOn(a, LocalDate.of(2030, 2, 1))); // 1st Friday
        assertFalse(service.occursOn(a, LocalDate.of(2030, 2, 15))); // 3rd Friday
    }

    @Test
    void nthWeekday_lastMonday() {
        // 2030-06-24 is the last Monday of June 2030.
        CalendarAppointment a = base(LocalDate.of(2030, 6, 24), RecurrenceType.MONTHLY_NTH_WEEKDAY)
                .recurrenceWeekOfMonth(-1)
                .recurrenceDayOfWeek(DayOfWeek.MONDAY)
                .build();
        assertTrue(service.occursOn(a, LocalDate.of(2030, 6, 24)));
        assertTrue(service.occursOn(a, LocalDate.of(2030, 7, 29))); // last Monday of July 2030
        assertFalse(service.occursOn(a, LocalDate.of(2030, 7, 22))); // 4th Monday, not last
    }

    @Test
    void nthWeekday_incompleteConfig_neverOccurs() {
        CalendarAppointment a = base(LocalDate.of(2030, 1, 11), RecurrenceType.MONTHLY_NTH_WEEKDAY)
                .recurrenceWeekOfMonth(2)
                .build(); // missing day of week
        assertFalse(service.occursOn(a, LocalDate.of(2030, 1, 11)));
    }

    // ── End date ──────────────────────────────────────────────────────────────

    @Test
    void recurrenceEndDate_stopsOccurrences() {
        CalendarAppointment a = base(LocalDate.of(2030, 6, 8), RecurrenceType.DAILY)
                .recurrenceEndDate(LocalDate.of(2030, 6, 10))
                .build();
        assertTrue(service.occursOn(a, LocalDate.of(2030, 6, 10)));
        assertFalse(service.occursOn(a, LocalDate.of(2030, 6, 11)));
    }

    // ── Null-safety ───────────────────────────────────────────────────────────

    @Test
    void nullInputs_returnFalse() {
        CalendarAppointment a = base(LocalDate.of(2030, 6, 8), RecurrenceType.NONE).build();
        assertFalse(service.occursOn(null, LocalDate.of(2030, 6, 8)));
        assertFalse(service.occursOn(a, null));
    }
}
