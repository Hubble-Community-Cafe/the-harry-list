package com.pimvanleeuwen.the_harry_list_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * A configurable form constraint managed by staff.
 * Examples:
 * - ACTIVITY_CONFLICT: EAT_CATERING conflicts with EAT_A_LA_CARTE
 * - LOCATION_LOCK: CATERING_CORONA_ROOM locks location to HUBBLE
 * - SEATING_LOCK: CATERING_CORONA_ROOM locks seating to INSIDE
 * - TIME_RESTRICTION: CATERING_CORONA_ROOM allows early times (09:00-10:45)
 * - ADVANCE_BOOKING: EAT_CATERING requires 7 days advance
 * - GUEST_LIMIT: EAT_A_LA_CARTE max 15 guests
 */
@Entity
@Table(name = "form_constraints")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FormConstraint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "constraint_type", nullable = false, length = 30)
    private FormConstraintType constraintType;

    /** The activity that triggers this constraint (e.g. CATERING_CORONA_ROOM). */
    @Column(name = "trigger_activity", nullable = false, length = 30)
    private String triggerActivity;

    /** Target value — meaning depends on type:
     *  ACTIVITY_CONFLICT: the conflicting activity (e.g. EAT_A_LA_CARTE)
     *  LOCATION_LOCK: the locked location (e.g. HUBBLE)
     *  SEATING_LOCK: the locked seating (e.g. INSIDE)
     *  TIME_RESTRICTION: "EARLY_ACCESS" or similar key
     *  ADVANCE_BOOKING: unused (days in numericValue)
     *  GUEST_LIMIT: unused (limit in numericValue)
     */
    @Column(name = "target_value", length = 50)
    private String targetValue;

    /** Numeric parameter — meaning depends on type:
     *  ADVANCE_BOOKING: minimum days ahead
     *  GUEST_LIMIT: maximum number of guests
     *  TIME_RESTRICTION: unused
     */
    @Column(name = "numeric_value")
    private Integer numericValue;

    /** Optional secondary value for extra context (e.g. time range). */
    @Column(name = "secondary_value", length = 100)
    private String secondaryValue;

    /** User-facing message displayed when the constraint applies. */
    @Column(nullable = false, length = 500)
    private String message;

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
