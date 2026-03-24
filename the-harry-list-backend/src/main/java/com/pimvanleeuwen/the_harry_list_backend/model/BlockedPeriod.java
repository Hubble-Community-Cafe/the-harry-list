package com.pimvanleeuwen.the_harry_list_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * A time period during which reservations are blocked.
 * Staff can create these to prevent bookings during holidays, maintenance, etc.
 * Optionally scoped to a specific location.
 */
@Entity
@Table(name = "blocked_periods")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BlockedPeriod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Optional — if set, only blocks this location. Null = blocks all locations. */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private BarLocation location;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    /** Optional time range within the dates. Null = entire day blocked. */
    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    /** Internal reason (staff-only). */
    @Column(nullable = false, length = 500)
    private String reason;

    /** Public-facing message shown to users when they try to book during this period. */
    @Column(name = "public_message", length = 500)
    private String publicMessage;

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @Column
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void onSave() {
        updatedAt = LocalDateTime.now();
    }
}
