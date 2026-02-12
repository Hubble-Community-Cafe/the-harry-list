package com.pimvanleeuwen.the_harry_list_backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Random;

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
    @Column(name = "contact_name", nullable = false)
    private String contactName;

    /** Email address for communication */
    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    @Column(name = "email", nullable = false)
    private String email;

    /** Phone number for contact */
    @Column(name = "phone_number")
    private String phoneNumber;

    /** Organization/Association name (if applicable) */
    @Column(name = "organization_name")
    private String organizationName;

    // ===== Event Details =====

    /** Title/name of the event */
    @NotBlank(message = "Event title is required")
    @Column(name = "event_title", nullable = false)
    private String eventTitle;

    /** Description of the event */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Type of event (Borrel, Lunch, Dinner, etc.) */
    @NotNull(message = "Event type is required")
    @Column(name = "event_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private EventType eventType;

    /** Who is organizing the event */
    @NotNull(message = "Organizer type is required")
    @Column(name = "organizer_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private OrganizerType organizerType;

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

    /** Setup time needed before the event (in minutes) */
    @Column(name = "setup_time_minutes")
    private Integer setupTimeMinutes;

    // ===== Location =====

    /** Which bar location (Hubble or Meteor) */
    @NotNull(message = "Location is required")
    @Column(name = "location", nullable = false)
    @Enumerated(EnumType.STRING)
    private BarLocation location;

    /** Seating area preference (inside/outside) */
    @Column(name = "seating_area")
    @Enumerated(EnumType.STRING)
    private SeatingArea seatingArea;

    /** Specific area within the bar (if applicable) */
    @Column(name = "specific_area")
    private String specificArea;

    // ===== Payment Information =====

    /** How the reservation will be paid */
    @NotNull(message = "Payment option is required")
    @Column(name = "payment_option", nullable = false)
    @Enumerated(EnumType.STRING)
    private PaymentOption paymentOption;

    /** TU/e Cost center number (if paying via cost center) */
    @Column(name = "cost_center")
    private String costCenter;

    /** Name for the invoice (if paying via invoice) */
    @Column(name = "invoice_name")
    private String invoiceName;

    /** Address for the invoice */
    @Column(name = "invoice_address")
    private String invoiceAddress;

    /** VAT number for invoice (if applicable) */
    @Column(name = "vat_number")
    private String vatNumber;

    // ===== Food & Drinks =====

    /** Whether food is needed for the event */
    @Column(name = "food_required")
    private Boolean foodRequired;

    /** Primary dietary preference */
    @Column(name = "dietary_preference")
    @Enumerated(EnumType.STRING)
    private DietaryPreference dietaryPreference;

    /** Additional dietary requirements or allergies */
    @Column(name = "dietary_notes", columnDefinition = "TEXT")
    private String dietaryNotes;

    /** Whether drinks are to be served */
    @Column(name = "drinks_included")
    private Boolean drinksIncluded;

    /** Budget per person for drinks/food (optional) */
    @Column(name = "budget_per_person")
    private Double budgetPerPerson;

    // ===== Additional Information =====

    /** Any additional comments or requests */
    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    /** Whether the organizer has agreed to terms and conditions */
    @Column(name = "terms_accepted")
    private Boolean termsAccepted;

    /** How did they hear about us */
    @Column(name = "referral_source")
    private String referralSource;

    // ===== Internal Fields =====

    /** Current status of the reservation */
    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private ReservationStatus status = ReservationStatus.PENDING;

    /** Internal notes (only visible to staff) */
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

    /**
     * Generate a random 6-character alphanumeric confirmation number.
     * Format: XXXXXX (e.g., "A3X7K9")
     */
    private String generateConfirmationNumber() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude similar looking chars (I, O, 0, 1)
        Random random = new Random();
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
