package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for GetReservationService.
 */
@ExtendWith(MockitoExtension.class)
class GetReservationServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private ReservationMapper reservationMapper;

    @InjectMocks
    private GetReservationService getReservationService;

    private com.pimvanleeuwen.the_harry_list_backend.model.Reservation sampleEntity;
    private Reservation sampleDto;

    @BeforeEach
    void setUp() {
        sampleEntity = createSampleEntity();
        sampleDto = createSampleDto();
    }

    @Test
    void execute_shouldReturnAllReservations() {
        // Given
        List<com.pimvanleeuwen.the_harry_list_backend.model.Reservation> entities =
                Arrays.asList(sampleEntity, createAnotherEntity());

        when(reservationRepository.findAll()).thenReturn(entities);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When
        ResponseEntity<List<Reservation>> response = getReservationService.execute(null);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size());
        verify(reservationRepository, times(1)).findAll();
    }

    @Test
    void execute_shouldReturnEmptyListWhenNoReservations() {
        // Given
        when(reservationRepository.findAll()).thenReturn(Arrays.asList());

        // When
        ResponseEntity<List<Reservation>> response = getReservationService.execute(null);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isEmpty());
    }

    @Test
    void getById_shouldReturnReservationWhenFound() {
        // Given
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleEntity));
        when(reservationMapper.toDto(sampleEntity)).thenReturn(sampleDto);

        // When
        ResponseEntity<Reservation> response = getReservationService.getById(1L);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(sampleDto.getContactName(), response.getBody().getContactName());
    }

    @Test
    void getById_shouldReturnNotFoundWhenReservationDoesNotExist() {
        // Given
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        // When
        ResponseEntity<Reservation> response = getReservationService.getById(999L);

        // Then
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNull(response.getBody());
    }

    private Reservation createSampleDto() {
        return Reservation.builder()
                .id(1L)
                .contactName("John Doe")
                .email("john@example.com")
                .eventTitle("Test Event")
                .eventType(EventType.BORREL)
                .organizerType(OrganizerType.ASSOCIATION)
                .location(BarLocation.HUBBLE)
                .paymentOption(PaymentOption.PIN)
                .status(ReservationStatus.PENDING)
                .build();
    }

    private com.pimvanleeuwen.the_harry_list_backend.model.Reservation createSampleEntity() {
        com.pimvanleeuwen.the_harry_list_backend.model.Reservation entity =
                new com.pimvanleeuwen.the_harry_list_backend.model.Reservation();
        entity.setId(1L);
        entity.setContactName("John Doe");
        entity.setEmail("john@example.com");
        entity.setEventTitle("Test Event");
        entity.setEventType(EventType.BORREL);
        entity.setOrganizerType(OrganizerType.ASSOCIATION);
        entity.setLocation(BarLocation.HUBBLE);
        entity.setPaymentOption(PaymentOption.PIN);
        entity.setStatus(ReservationStatus.PENDING);
        return entity;
    }

    private com.pimvanleeuwen.the_harry_list_backend.model.Reservation createAnotherEntity() {
        com.pimvanleeuwen.the_harry_list_backend.model.Reservation entity =
                new com.pimvanleeuwen.the_harry_list_backend.model.Reservation();
        entity.setId(2L);
        entity.setContactName("Jane Doe");
        entity.setEmail("jane@example.com");
        entity.setEventTitle("Another Event");
        entity.setEventType(EventType.DINNER);
        entity.setOrganizerType(OrganizerType.COMPANY);
        entity.setLocation(BarLocation.METEOR);
        entity.setPaymentOption(PaymentOption.INVOICE);
        entity.setStatus(ReservationStatus.CONFIRMED);
        return entity;
    }
}

