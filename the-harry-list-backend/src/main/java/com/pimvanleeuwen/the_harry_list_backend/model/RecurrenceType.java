package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * Recurrence pattern for calendar appointments.
 *
 * <p>The frequency family is captured by this enum; the finer detail (how often,
 * and — for {@link #MONTHLY_NTH_WEEKDAY} — which weekday of which week) lives in
 * the structured {@code recurrenceInterval}, {@code recurrenceWeekOfMonth} and
 * {@code recurrenceDayOfWeek} fields on {@code CalendarAppointment}. This keeps the
 * model generic: new patterns are added by extending this enum plus the single
 * RRULE mapper in {@code ICalendarService}, rather than touching many call sites.
 */
public enum RecurrenceType {
    NONE,
    DAILY,
    WEEKLY,
    /** Legacy shorthand for "every 2 weeks". Retained for backward compatibility;
     *  new appointments express this as WEEKLY with {@code recurrenceInterval = 2}. */
    BIWEEKLY,
    MONTHLY,
    YEARLY,
    /** Monthly on the Nth weekday, e.g. "every 2nd Friday" or "the last Monday".
     *  Driven by {@code recurrenceWeekOfMonth} (1–4, or -1 for last) and
     *  {@code recurrenceDayOfWeek}. */
    MONTHLY_NTH_WEEKDAY
}