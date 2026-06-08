package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.CalendarAppointment;
import com.pimvanleeuwen.the_harry_list_backend.model.RecurrenceType;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;

/**
 * Resolves whether a {@link CalendarAppointment} occurs on a concrete date.
 *
 * <p>This is the backend counterpart to the admin frontend's {@code recurrence.ts}
 * expander: both interpret the same structured recurrence model (a frequency family
 * plus an optional "every N" interval and, for {@link RecurrenceType#MONTHLY_NTH_WEEKDAY},
 * an ordinal week + weekday). Keeping the semantics in one focused service means the PDF
 * export and any future date-based consumers agree on what "this appointment happens on
 * day X" means, rather than each re-deriving it.
 */
@Service
public class AppointmentRecurrenceService {

    /**
     * Whether {@code appointment} has an occurrence on {@code date}, honoring its start
     * date, optional recurrence end date, and recurrence pattern. Does not consider the
     * {@code enabled} flag or location — callers decide visibility.
     */
    public boolean occursOn(CalendarAppointment appointment, LocalDate date) {
        if (appointment == null || date == null || appointment.getDate() == null) {
            return false;
        }

        LocalDate start = appointment.getDate();
        if (date.isBefore(start)) {
            return false;
        }
        if (appointment.getRecurrenceEndDate() != null && date.isAfter(appointment.getRecurrenceEndDate())) {
            return false;
        }

        RecurrenceType type = appointment.getRecurrenceType() != null
                ? appointment.getRecurrenceType()
                : RecurrenceType.NONE;
        int interval = effectiveInterval(appointment);

        return switch (type) {
            case NONE -> date.isEqual(start);
            case DAILY -> daysBetween(start, date) % interval == 0;
            case WEEKLY -> {
                long days = daysBetween(start, date);
                yield days % 7 == 0 && (days / 7) % interval == 0;
            }
            case MONTHLY -> date.getDayOfMonth() == start.getDayOfMonth()
                    && monthsBetween(start, date) % interval == 0;
            case YEARLY -> date.getDayOfMonth() == start.getDayOfMonth()
                    && date.getMonthValue() == start.getMonthValue()
                    && (date.getYear() - start.getYear()) % interval == 0;
            case MONTHLY_NTH_WEEKDAY -> occursOnNthWeekday(appointment, start, date, interval);
        };
    }

    private boolean occursOnNthWeekday(CalendarAppointment appointment, LocalDate start,
                                       LocalDate date, int interval) {
        Integer week = appointment.getRecurrenceWeekOfMonth();
        DayOfWeek day = appointment.getRecurrenceDayOfWeek();
        if (week == null || day == null) {
            return false;
        }
        if (date.getDayOfWeek() != day) {
            return false;
        }
        if (!isNthWeekdayOfMonth(date, week)) {
            return false;
        }
        return monthsBetween(start, date) % interval == 0;
    }

    /**
     * Whether {@code date} is the Nth occurrence of its own weekday within its month.
     * {@code week} is 1–4 for first–fourth, or -1 for the last occurrence.
     */
    private boolean isNthWeekdayOfMonth(LocalDate date, int week) {
        if (week == -1) {
            // The last <weekday> of the month: one week later rolls into the next month.
            return date.plusWeeks(1).getMonthValue() != date.getMonthValue();
        }
        return ((date.getDayOfMonth() - 1) / 7) + 1 == week;
    }

    /** Resolves the effective "every N" interval, defaulting to 1 when unset or invalid. */
    private int effectiveInterval(CalendarAppointment appointment) {
        Integer interval = appointment.getRecurrenceInterval();
        return (interval != null && interval > 0) ? interval : 1;
    }

    private long daysBetween(LocalDate start, LocalDate date) {
        return java.time.temporal.ChronoUnit.DAYS.between(start, date);
    }

    private long monthsBetween(LocalDate start, LocalDate date) {
        return (long) (date.getYear() - start.getYear()) * 12 + (date.getMonthValue() - start.getMonthValue());
    }
}
