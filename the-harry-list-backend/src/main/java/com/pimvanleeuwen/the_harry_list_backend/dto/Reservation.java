package com.pimvanleeuwen.the_harry_list_backend.dto;

import com.pimvanleeuwen.the_harry_list_backend.model.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
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
    @Size(max = 255, message = "Name must not exceed 255 characters")
    private String contactName;

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    @Size(max = 50, message = "Phone number must not exceed 50 characters")
    private String phoneNumber;

    @Size(max = 255, message = "Organization name must not exceed 255 characters")
    private String organizationName;

    // ===== Event Details =====
    @NotBlank(message = "Event title is required")
    @Size(max = 255, message = "Event title must not exceed 255 characters")
    private String eventTitle;

    @NotBlank(message = "Description is required")
    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    private Set<SpecialActivity> specialActivities;

    // @Positive alone permits null (Bean Validation only rejects non-null values <= 0),
    // so a client sending null would silently blank the field. The admin edit form used
    // to do exactly that via parseInt("") -> NaN -> JSON null.
    @NotNull(message = "Number of guests is required")
    @Positive(message = "Number of guests must be positive")
    private Integer expectedGuests;

    // ===== Date and Time =====
    @NotNull(message = "Event date is required")
    private LocalDate eventDate;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    @Size(max = 1000, message = "Long reservation reason must not exceed 1000 characters")
    private String longReservationReason;

    // ===== Location =====
    private BarLocation location;

    @NotNull(message = "Seating area is required")
    private SeatingArea seatingArea;

    // ===== Payment Information =====
    @NotNull(message = "Payment option is required")
    private PaymentOption paymentOption;

    private InvoiceType invoiceType;

    @Size(max = 100, message = "Cost center must not exceed 100 characters")
    private String costCenter;

    @Size(max = 255, message = "Invoice name must not exceed 255 characters")
    private String invoiceName;

    @Size(max = 500, message = "Invoice address must not exceed 500 characters")
    private String invoiceAddress;

    @Size(max = 1000, message = "Invoice remarks must not exceed 1000 characters")
    private String invoiceRemarks;

    // ===== Catering =====
    @Size(max = 1000, message = "Catering dietary notes must not exceed 1000 characters")
    private String cateringDietaryNotes;

    private Boolean cateringArranged;

    // ===== Additional Information =====
    @Size(max = 5000, message = "Comments must not exceed 5000 characters")
    private String comments;

    private Boolean termsAccepted;

    // ===== Internal (staff-only) =====
    @Size(max = 5000, message = "Internal notes must not exceed 5000 characters")
    private String internalNotes;

    // ===== Read-only fields (returned in responses) =====
    private ReservationStatus status;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
