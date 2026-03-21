package com.pimvanleeuwen.the_harry_list_backend.dto;

import com.pimvanleeuwen.the_harry_list_backend.model.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Set;

/**
 * DTO for creating and updating reservations.
 * Maps to the form fields on hubble.cafe and meteorcommunity.cafe
 */
@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Reservation {

    private Long id;

    private String confirmationNumber;

    // ===== Contact Information =====
    @NotBlank(message = "Name is required")
    private String contactName;

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    private String email;

    private String phoneNumber;

    private String organizationName;

    // ===== Event Details =====
    @NotBlank(message = "Event title is required")
    private String eventTitle;

    @NotBlank(message = "Description is required")
    private String description;

    private Set<SpecialActivity> specialActivities;

    @Positive(message = "Number of guests must be positive")
    private Integer expectedGuests;

    // ===== Date and Time =====
    @NotNull(message = "Event date is required")
    private LocalDate eventDate;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    private String longReservationReason;

    // ===== Location =====
    private BarLocation location;

    @NotNull(message = "Seating area is required")
    private SeatingArea seatingArea;

    // ===== Payment Information =====
    @NotNull(message = "Payment option is required")
    private PaymentOption paymentOption;

    private InvoiceType invoiceType;

    private String costCenter;

    private String invoiceName;

    private String invoiceAddress;

    private String invoiceRemarks;

    // ===== Catering =====
    private String cateringDietaryNotes;

    private Boolean cateringArranged;

    // ===== Additional Information =====
    private String comments;

    private Boolean termsAccepted;

    // ===== Internal (staff-only) =====
    private String internalNotes;

    // ===== Read-only fields (returned in responses) =====
    private ReservationStatus status;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
