package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import org.springframework.stereotype.Service;

import java.util.HashSet;

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
        entity.setSpecialActivities(dto.getSpecialActivities() != null ? new HashSet<>(dto.getSpecialActivities()) : new HashSet<>());
        entity.setExpectedGuests(dto.getExpectedGuests());

        // Date and Time
        entity.setEventDate(dto.getEventDate());
        entity.setStartTime(dto.getStartTime());
        entity.setEndTime(dto.getEndTime());
        entity.setLongReservationReason(dto.getLongReservationReason());

        // Location
        entity.setLocation(dto.getLocation());
        entity.setSeatingArea(dto.getSeatingArea());

        // Payment
        entity.setPaymentOption(dto.getPaymentOption());
        entity.setInvoiceType(dto.getInvoiceType());
        entity.setCostCenter(dto.getCostCenter());
        entity.setInvoiceName(dto.getInvoiceName());
        entity.setInvoiceAddress(dto.getInvoiceAddress());
        entity.setInvoiceRemarks(dto.getInvoiceRemarks());

        // Catering
        entity.setCateringDietaryNotes(dto.getCateringDietaryNotes());
        if (dto.getCateringArranged() != null) {
            entity.setCateringArranged(dto.getCateringArranged());
        }

        // Additional
        entity.setComments(dto.getComments());
        entity.setTermsAccepted(dto.getTermsAccepted());
        if (dto.getInternalNotes() != null) {
            entity.setInternalNotes(dto.getInternalNotes());
        }
        if (dto.getInternalNotes() != null) {
            entity.setInternalNotes(dto.getInternalNotes());
        }

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
                .specialActivities(entity.getSpecialActivities() != null ? new HashSet<>(entity.getSpecialActivities()) : new HashSet<>())
                .expectedGuests(entity.getExpectedGuests())
                // Date/Time
                .eventDate(entity.getEventDate())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .longReservationReason(entity.getLongReservationReason())
                // Location
                .location(entity.getLocation())
                .seatingArea(entity.getSeatingArea())
                // Payment
                .paymentOption(entity.getPaymentOption())
                .invoiceType(entity.getInvoiceType())
                .costCenter(entity.getCostCenter())
                .invoiceName(entity.getInvoiceName())
                .invoiceAddress(entity.getInvoiceAddress())
                .invoiceRemarks(entity.getInvoiceRemarks())
                // Catering
                .cateringDietaryNotes(entity.getCateringDietaryNotes())
                .cateringArranged(entity.isCateringArranged())
                // Additional
                .comments(entity.getComments())
                .termsAccepted(entity.getTermsAccepted())
                .internalNotes(entity.getInternalNotes())
                // Status
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
