package com.pimvanleeuwen.the_harry_list_backend.dto;

import com.pimvanleeuwen.the_harry_list_backend.model.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

/**
 * DTO for public reservation submissions.
 * Includes reCAPTCHA token for bot protection.
 */
@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class PublicReservationRequest {

    // ===== reCAPTCHA Token =====
    private String recaptchaToken;

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
    @Max(value = 500, message = "Please contact us directly for groups over 500 people")
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

    // ===== Additional Information =====
    private String comments;

    private Boolean termsAccepted;

    /**
     * Convert this public request to a Reservation DTO.
     */
    public Reservation toReservation() {
        return Reservation.builder()
                .contactName(contactName)
                .email(email)
                .phoneNumber(phoneNumber)
                .organizationName(organizationName)
                .eventTitle(eventTitle)
                .description(description)
                .specialActivities(specialActivities)
                .expectedGuests(expectedGuests)
                .eventDate(eventDate)
                .startTime(startTime)
                .endTime(endTime)
                .longReservationReason(longReservationReason)
                .location(location)
                .seatingArea(seatingArea)
                .paymentOption(paymentOption)
                .invoiceType(invoiceType)
                .costCenter(costCenter)
                .invoiceName(invoiceName)
                .invoiceAddress(invoiceAddress)
                .invoiceRemarks(invoiceRemarks)
                .cateringDietaryNotes(cateringDietaryNotes)
                .comments(comments)
                .termsAccepted(termsAccepted)
                .build();
    }
}
