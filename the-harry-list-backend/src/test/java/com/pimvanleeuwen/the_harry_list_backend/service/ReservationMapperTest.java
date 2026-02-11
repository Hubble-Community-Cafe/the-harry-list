package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ReservationMapper.
 */
class ReservationMapperTest {

    private ReservationMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new ReservationMapper();
    }

    @Test
    void toEntity_shouldMapAllFieldsCorrectly() {
        // Given
        Reservation dto = createSampleDto();

        // When
        com.pimvanleeuwen.the_harry_list_backend.model.Reservation entity = mapper.toEntity(dto);

        // Then
        assertNotNull(entity);
        assertEquals(dto.getContactName(), entity.getContactName());
        assertEquals(dto.getEmail(), entity.getEmail());
        assertEquals(dto.getPhoneNumber(), entity.getPhoneNumber());
        assertEquals(dto.getOrganizationName(), entity.getOrganizationName());
        assertEquals(dto.getEventTitle(), entity.getEventTitle());
        assertEquals(dto.getDescription(), entity.getDescription());
        assertEquals(dto.getEventType(), entity.getEventType());
        assertEquals(dto.getOrganizerType(), entity.getOrganizerType());
        assertEquals(dto.getExpectedGuests(), entity.getExpectedGuests());
        assertEquals(dto.getEventDate(), entity.getEventDate());
        assertEquals(dto.getStartTime(), entity.getStartTime());
        assertEquals(dto.getEndTime(), entity.getEndTime());
        assertEquals(dto.getLocation(), entity.getLocation());
        assertEquals(dto.getPaymentOption(), entity.getPaymentOption());
    }

    @Test
    void toEntity_shouldReturnNullWhenDtoIsNull() {
        // When
        com.pimvanleeuwen.the_harry_list_backend.model.Reservation entity = mapper.toEntity(null);

        // Then
        assertNull(entity);
    }

    @Test
    void toEntity_shouldSetIdWhenProvided() {
        // Given
        Reservation dto = createSampleDto();
        dto.setId(123L);

        // When
        com.pimvanleeuwen.the_harry_list_backend.model.Reservation entity = mapper.toEntity(dto);

        // Then
        assertEquals(123L, entity.getId());
    }

    @Test
    void toDto_shouldMapAllFieldsCorrectly() {
        // Given
        com.pimvanleeuwen.the_harry_list_backend.model.Reservation entity = createSampleEntity();

        // When
        Reservation dto = mapper.toDto(entity);

        // Then
        assertNotNull(dto);
        assertEquals(entity.getId(), dto.getId());
        assertEquals(entity.getContactName(), dto.getContactName());
        assertEquals(entity.getEmail(), dto.getEmail());
        assertEquals(entity.getPhoneNumber(), dto.getPhoneNumber());
        assertEquals(entity.getOrganizationName(), dto.getOrganizationName());
        assertEquals(entity.getEventTitle(), dto.getEventTitle());
        assertEquals(entity.getDescription(), dto.getDescription());
        assertEquals(entity.getEventType(), dto.getEventType());
        assertEquals(entity.getOrganizerType(), dto.getOrganizerType());
        assertEquals(entity.getExpectedGuests(), dto.getExpectedGuests());
        assertEquals(entity.getEventDate(), dto.getEventDate());
        assertEquals(entity.getStartTime(), dto.getStartTime());
        assertEquals(entity.getEndTime(), dto.getEndTime());
        assertEquals(entity.getLocation(), dto.getLocation());
        assertEquals(entity.getPaymentOption(), dto.getPaymentOption());
        assertEquals(entity.getStatus(), dto.getStatus());
    }

    @Test
    void toDto_shouldReturnNullWhenEntityIsNull() {
        // When
        Reservation dto = mapper.toDto(null);

        // Then
        assertNull(dto);
    }

    @Test
    void toDto_shouldIncludeStatusAndTimestamps() {
        // Given
        com.pimvanleeuwen.the_harry_list_backend.model.Reservation entity = createSampleEntity();
        entity.setStatus(ReservationStatus.CONFIRMED);

        // When
        Reservation dto = mapper.toDto(entity);

        // Then
        assertEquals(ReservationStatus.CONFIRMED, dto.getStatus());
    }

    private Reservation createSampleDto() {
        return Reservation.builder()
                .contactName("John Doe")
                .email("john@example.com")
                .phoneNumber("+31612345678")
                .organizationName("Test Association")
                .eventTitle("Annual Borrel")
                .description("Our yearly drinks event")
                .eventType(EventType.BORREL)
                .organizerType(OrganizerType.ASSOCIATION)
                .expectedGuests(50)
                .eventDate(LocalDate.of(2026, 3, 15))
                .startTime(LocalTime.of(16, 0))
                .endTime(LocalTime.of(22, 0))
                .location(BarLocation.HUBBLE)
                .paymentOption(PaymentOption.PIN)
                .foodRequired(true)
                .dietaryPreference(DietaryPreference.VEGETARIAN)
                .termsAccepted(true)
                .build();
    }

    private com.pimvanleeuwen.the_harry_list_backend.model.Reservation createSampleEntity() {
        com.pimvanleeuwen.the_harry_list_backend.model.Reservation entity =
                new com.pimvanleeuwen.the_harry_list_backend.model.Reservation();
        entity.setId(1L);
        entity.setContactName("Jane Doe");
        entity.setEmail("jane@example.com");
        entity.setPhoneNumber("+31687654321");
        entity.setOrganizationName("Test Company");
        entity.setEventTitle("Company Dinner");
        entity.setDescription("End of year dinner");
        entity.setEventType(EventType.DINNER);
        entity.setOrganizerType(OrganizerType.COMPANY);
        entity.setExpectedGuests(30);
        entity.setEventDate(LocalDate.of(2026, 12, 20));
        entity.setStartTime(LocalTime.of(18, 0));
        entity.setEndTime(LocalTime.of(23, 0));
        entity.setLocation(BarLocation.METEOR);
        entity.setPaymentOption(PaymentOption.INVOICE);
        entity.setStatus(ReservationStatus.PENDING);
        return entity;
    }
}

