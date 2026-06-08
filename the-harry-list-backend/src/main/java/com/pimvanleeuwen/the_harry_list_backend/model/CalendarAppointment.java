package com.pimvanleeuwen.the_harry_list_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * A custom calendar appointment that appears in ICS calendar feeds.
 * Simpler than a reservation — used for staff notes, reminders, and recurring events.
 */
@Entity
@Table(name = "calendar_appointments")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CalendarAppointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "event_date", nullable = false)
    private LocalDate date;

    @Column(name = "all_day", nullable = false)
    @Builder.Default
    private Boolean allDay = false;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private BarLocation location;

    @Enumerated(EnumType.STRING)
    @Column(name = "recurrence_type", length = 20, nullable = false)
    @Builder.Default
    private RecurrenceType recurrenceType = RecurrenceType.NONE;

    /**
     * "Every N" multiplier for the recurrence (RRULE INTERVAL). Null or 1 means every period.
     * Applies to DAILY/WEEKLY/MONTHLY/YEARLY/MONTHLY_NTH_WEEKDAY.
     */
    @Column(name = "recurrence_interval")
    private Integer recurrenceInterval;

    /**
     * Which week of the month for {@link RecurrenceType#MONTHLY_NTH_WEEKDAY}:
     * 1–4 for first–fourth, or -1 for the last occurrence (RRULE BYSETPOS/BYDAY ordinal).
     */
    @Column(name = "recurrence_week_of_month")
    private Integer recurrenceWeekOfMonth;

    /**
     * Which weekday for {@link RecurrenceType#MONTHLY_NTH_WEEKDAY}, e.g. FRIDAY for "2nd Friday".
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "recurrence_day_of_week", length = 10)
    private DayOfWeek recurrenceDayOfWeek;

    @Column(name = "recurrence_end_date")
    private LocalDate recurrenceEndDate;

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}