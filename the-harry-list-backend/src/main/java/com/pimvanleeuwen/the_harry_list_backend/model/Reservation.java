package com.pimvanleeuwen.the_harry_list_backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.security.SecureRandom;
import java.util.HashSet;
import java.util.Set;

/**
 * Reservation entity representing a bar/event reservation.
 * This model is designed to support both Hubble and Meteor reservation forms.
 */
@Data
@Entity
@Table(name = "reservation")
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    /** Random confirmation number for the reservation (e.g., "A3X7K9") */
    @Column(name = "confirmation_number", unique = true, nullable = false, length = 6)
    private String confirmationNumber;

    // ===== Contact Information =====

    /** Full name of the person making the reservation */
    @NotBlank(message = "Name is required")
    @Size(max = 255, message = "Name must not exceed 255 characters")
    @Column(name = "contact_name", nullable = false)
    private String contactName;

    /** Email address for communication */
    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    @Column(name = "email", nullable = false)
    private String email;

    /** Phone number for contact */
    @Size(max = 50, message = "Phone number must not exceed 50 characters")
    @Column(name = "phone_number")
    private String phoneNumber;

    /** Organization/Association name (if applicable) */
    @Size(max = 255, message = "Organization name must not exceed 255 characters")
    @Column(name = "organization_name")
    private String organizationName;

    // ===== Event Details =====

    /** Title/name of the event */
    @NotBlank(message = "Event title is required")
    @Size(max = 255, message = "Event title must not exceed 255 characters")
    @Column(name = "event_title", nullable = false)
    private String eventTitle;

    /** Description of the event */
    @NotBlank(message = "Description is required")
    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Special activities selected for this reservation */
    @ElementCollection(targetClass = SpecialActivity.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "reservation_special_activities", joinColumns = @JoinColumn(name = "reservation_id"))
    @Column(name = "special_activity")
    @Enumerated(EnumType.STRING)
    private Set<SpecialActivity> specialActivities = new HashSet<>();

    /** Expected number of guests */
    @Positive(message = "Number of guests must be positive")
    @Column(name = "expected_guests")
    private Integer expectedGuests;

    // ===== Date and Time =====

    /** Date of the event */
    @NotNull(message = "Event date is required")
    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;

    /** Start time of the event */
    @NotNull(message = "Start time is required")
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    /** End time of the event */
    @NotNull(message = "End time is required")
    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    /** Reason for long reservation (required when duration > 3 hours) */
    @Size(max = 1000, message = "Long reservation reason must not exceed 1000 characters")
    @Column(name = "long_reservation_reason", columnDefinition = "TEXT")
    private String longReservationReason;

    // ===== Location =====

    /** Which bar location (Hubble, Meteor, or NO_PREFERENCE) */
    @Column(name = "location")
    @Enumerated(EnumType.STRING)
    private BarLocation location;

    /** Seating area (inside/outside) */
    @NotNull(message = "Seating area is required")
    @Column(name = "seating_area", nullable = false)
    @Enumerated(EnumType.STRING)
    private SeatingArea seatingArea;

    // ===== Payment Information =====

    /** How the reservation will be paid */
    @NotNull(message = "Payment option is required")
    @Column(name = "payment_option", nullable = false)
    @Enumerated(EnumType.STRING)
    private PaymentOption paymentOption;

    /** Invoice sub-type (only when paymentOption=INVOICE) */
    @Column(name = "invoice_type")
    @Enumerated(EnumType.STRING)
    private InvoiceType invoiceType;

    /** TU/e or Fontys cost center number (kostenplaats) */
    @Size(max = 100, message = "Cost center must not exceed 100 characters")
    @Column(name = "cost_center")
    private String costCenter;

    /** Company name for external invoices */
    @Size(max = 255, message = "Invoice name must not exceed 255 characters")
    @Column(name = "invoice_name")
    private String invoiceName;

    /** Address for external invoices */
    @Size(max = 500, message = "Invoice address must not exceed 500 characters")
    @Column(name = "invoice_address")
    private String invoiceAddress;

    /** Remarks for external invoices */
    @Size(max = 1000, message = "Invoice remarks must not exceed 1000 characters")
    @Column(name = "invoice_remarks", columnDefinition = "TEXT")
    private String invoiceRemarks;

    // ===== Catering =====

    /** Dietary notes for catering (allergies, preferences - free text) */
    @Size(max = 1000, message = "Catering dietary notes must not exceed 1000 characters")
    @Column(name = "catering_dietary_notes", columnDefinition = "TEXT")
    private String cateringDietaryNotes;

    /** Whether catering has been internally arranged by staff */
    @Column(name = "catering_arranged", nullable = false)
    private boolean cateringArranged = false;

    // ===== Additional Information =====

    /** Location/seating remarks */
    @Size(max = 5000, message = "Comments must not exceed 5000 characters")
    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    /** Whether the organizer has agreed to terms and conditions */
    @Column(name = "terms_accepted")
    private Boolean termsAccepted;

    // ===== Internal Fields =====

    /** Current status of the reservation */
    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private ReservationStatus status = ReservationStatus.PENDING;

    /** Internal notes (only visible to staff) */
    @Size(max = 5000, message = "Internal notes must not exceed 5000 characters")
    @Column(name = "internal_notes", columnDefinition = "TEXT")
    private String internalNotes;

    /** When the reservation was created */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** When the reservation was last updated */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Staff member who confirmed the reservation */
    @Column(name = "confirmed_by")
    private String confirmedBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = ReservationStatus.PENDING;
        }
        if (confirmationNumber == null) {
            confirmationNumber = generateConfirmationNumber();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /**
     * Generate a random 6-character alphanumeric confirmation number.
     * Format: XXXXXX (e.g., "A3X7K9")
     */
    private String generateConfirmationNumber() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude similar looking chars (I, O, 0, 1)
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(SECURE_RANDOM.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
