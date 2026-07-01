package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

/**
 * Builds the PII-free {@code APP_ANALYTICS} logfmt lines that are scraped into Loki
 * (job=app-analytics). Every value here is a coarse, non-identifying bucket: no name,
 * email, phone, id or free text ever appears. Kept as a separate, pure helper so the
 * bucket boundaries can be unit-tested directly.
 */
public final class ReservationAnalytics {

    private ReservationAnalytics() {
    }

    /** ISO weekday (Mon=1 … Sun=7) rendered as a stable, sortable label. */
    private static final String[] DAY_OF_WEEK = {
            "1_Mon", "2_Tue", "3_Wed", "4_Thu", "5_Fri", "6_Sat", "7_Sun"
    };

    /** Bar location name, falling back to NO_PREFERENCE when unset. */
    static String bar(BarLocation location) {
        return (location != null ? location : BarLocation.NO_PREFERENCE).name();
    }

    static String dayOfWeek(LocalDate eventDate) {
        return DAY_OF_WEEK[eventDate.getDayOfWeek().getValue() - 1];
    }

    /** Coarse part-of-day bucket from the start time. */
    static String slot(LocalTime startTime) {
        int minutes = startTime.getHour() * 60 + startTime.getMinute();
        if (minutes < 12 * 60) return "1_morning";     // before 12:00
        if (minutes < 17 * 60) return "2_afternoon";   // 12:00–16:59
        if (minutes < 22 * 60) return "3_evening";     // 17:00–21:59
        return "4_night";                              // 22:00 and later
    }

    /** Coarse guest-count bucket. */
    static String guests(Integer expectedGuests) {
        int g = expectedGuests != null ? expectedGuests : 0;
        if (g < 20) return "1_lt20";
        if (g < 50) return "2_20_50";
        if (g < 100) return "3_50_100";
        return "4_gte100";
    }

    /** Coarse lead-time bucket: whole days between the booking and the event date. */
    static String lead(LocalDateTime createdAt, LocalDate eventDate) {
        LocalDate bookedOn = (createdAt != null ? createdAt.toLocalDate() : LocalDate.now());
        long days = ChronoUnit.DAYS.between(bookedOn, eventDate);
        if (days < 7) return "1_same_week";   // also clamps negatives (event already passed)
        if (days < 14) return "2_wk1_2";
        if (days < 28) return "3_wk3_4";
        return "4_gt_4wk";
    }

    /** The enriched reservation-created line. Contains only coarse buckets — no PII. */
    public static String reservationCreatedLine(Reservation r) {
        return "APP_ANALYTICS event=reservation_created"
                + " bar=" + bar(r.getLocation())
                + " dow=" + dayOfWeek(r.getEventDate())
                + " slot=" + slot(r.getStartTime())
                + " guests=" + guests(r.getExpectedGuests())
                + " lead=" + lead(r.getCreatedAt(), r.getEventDate());
    }

    /** The status-change line. Contains only the new status and the bar — no PII. */
    public static String reservationStatusChangedLine(ReservationStatus status, BarLocation location) {
        return "APP_ANALYTICS event=reservation_status_changed"
                + " status=" + status.name()
                + " bar=" + bar(location);
    }
}
