package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import org.springframework.stereotype.Service;

/**
 * Mapper service for converting between Reservation entity and DTO.
 */
@Service
public class ReservationMapper {

    /**
     * Convert DTO to Entity for creating/updating.
     */
    public Reservation toEntity(com.pimvanleeuwen.the_harry_list_backend.dto.Reservation dto) {
        if (dto == null) {
            return null;
        }

        Reservation entity = new Reservation();

        // ID (only for updates)
        if (dto.getId() != null) {
            entity.setId(dto.getId());
        }

        // Contact Information
        entity.setContactName(dto.getContactName());
        entity.setEmail(dto.getEmail());
        entity.setPhoneNumber(dto.getPhoneNumber());
        entity.setOrganizationName(dto.getOrganizationName());

        // Event Details
        entity.setEventTitle(dto.getEventTitle());
        entity.setDescription(dto.getDescription());
        entity.setEventType(dto.getEventType());
        entity.setOrganizerType(dto.getOrganizerType());
        entity.setExpectedGuests(dto.getExpectedGuests());

        // Date and Time
        entity.setEventDate(dto.getEventDate());
        entity.setStartTime(dto.getStartTime());
        entity.setEndTime(dto.getEndTime());
        entity.setSetupTimeMinutes(dto.getSetupTimeMinutes());

        // Location
        entity.setLocation(dto.getLocation());
        entity.setSpecificArea(dto.getSpecificArea());

        // Payment
        entity.setPaymentOption(dto.getPaymentOption());
        entity.setCostCenter(dto.getCostCenter());
        entity.setInvoiceName(dto.getInvoiceName());
        entity.setInvoiceAddress(dto.getInvoiceAddress());
        entity.setVatNumber(dto.getVatNumber());

        // Food & Drinks
        entity.setFoodRequired(dto.getFoodRequired());
        entity.setDietaryPreference(dto.getDietaryPreference());
        entity.setDietaryNotes(dto.getDietaryNotes());
        entity.setDrinksIncluded(dto.getDrinksIncluded());
        entity.setBudgetPerPerson(dto.getBudgetPerPerson());

        // Additional
        entity.setComments(dto.getComments());
        entity.setTermsAccepted(dto.getTermsAccepted());
        entity.setReferralSource(dto.getReferralSource());

        return entity;
    }

    /**
     * Convert Entity to DTO for responses.
     */
    public com.pimvanleeuwen.the_harry_list_backend.dto.Reservation toDto(Reservation entity) {
        if (entity == null) {
            return null;
        }

        return com.pimvanleeuwen.the_harry_list_backend.dto.Reservation.builder()
                .id(entity.getId())
                .confirmationNumber(entity.getConfirmationNumber())
                // Contact
                .contactName(entity.getContactName())
                .email(entity.getEmail())
                .phoneNumber(entity.getPhoneNumber())
                .organizationName(entity.getOrganizationName())
                // Event
                .eventTitle(entity.getEventTitle())
                .description(entity.getDescription())
                .eventType(entity.getEventType())
                .organizerType(entity.getOrganizerType())
                .expectedGuests(entity.getExpectedGuests())
                // Date/Time
                .eventDate(entity.getEventDate())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .setupTimeMinutes(entity.getSetupTimeMinutes())
                // Location
                .location(entity.getLocation())
                .specificArea(entity.getSpecificArea())
                // Payment
                .paymentOption(entity.getPaymentOption())
                .costCenter(entity.getCostCenter())
                .invoiceName(entity.getInvoiceName())
                .invoiceAddress(entity.getInvoiceAddress())
                .vatNumber(entity.getVatNumber())
                // Food
                .foodRequired(entity.getFoodRequired())
                .dietaryPreference(entity.getDietaryPreference())
                .dietaryNotes(entity.getDietaryNotes())
                .drinksIncluded(entity.getDrinksIncluded())
                .budgetPerPerson(entity.getBudgetPerPerson())
                // Additional
                .comments(entity.getComments())
                .termsAccepted(entity.getTermsAccepted())
                .referralSource(entity.getReferralSource())
                // Status
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}

