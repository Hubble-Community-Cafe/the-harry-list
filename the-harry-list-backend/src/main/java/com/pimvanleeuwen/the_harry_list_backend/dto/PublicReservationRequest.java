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
import java.time.LocalTime;

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

    private String description;

    @NotNull(message = "Event type is required")
    private EventType eventType;

    @NotNull(message = "Organizer type is required")
    private OrganizerType organizerType;

    @Positive(message = "Number of guests must be positive")
    private Integer expectedGuests;

    // ===== Date and Time =====
    @NotNull(message = "Event date is required")
    private LocalDate eventDate;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    private Integer setupTimeMinutes;

    // ===== Location =====
    @NotNull(message = "Location is required")
    private BarLocation location;

    private SeatingArea seatingArea;

    private String specificArea;

    // ===== Payment Information =====
    @NotNull(message = "Payment option is required")
    private PaymentOption paymentOption;

    private String costCenter;

    private String invoiceName;

    private String invoiceAddress;

    private String vatNumber;

    // ===== Food & Drinks =====
    private Boolean foodRequired;

    private DietaryPreference dietaryPreference;

    private String dietaryNotes;

    private Boolean drinksIncluded;

    private Double budgetPerPerson;

    // ===== Additional Information =====
    private String comments;

    private Boolean termsAccepted;

    private String referralSource;

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
                .eventType(eventType)
                .organizerType(organizerType)
                .expectedGuests(expectedGuests)
                .eventDate(eventDate)
                .startTime(startTime)
                .endTime(endTime)
                .setupTimeMinutes(setupTimeMinutes)
                .location(location)
                .seatingArea(seatingArea)
                .specificArea(specificArea)
                .paymentOption(paymentOption)
                .costCenter(costCenter)
                .invoiceName(invoiceName)
                .invoiceAddress(invoiceAddress)
                .vatNumber(vatNumber)
                .foodRequired(foodRequired)
                .dietaryPreference(dietaryPreference)
                .dietaryNotes(dietaryNotes)
                .drinksIncluded(drinksIncluded)
                .budgetPerPerson(budgetPerPerson)
                .comments(comments)
                .termsAccepted(termsAccepted)
                .referralSource(referralSource)
                .build();
    }
}

