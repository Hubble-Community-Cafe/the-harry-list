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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for CreateReservationService.
 */
@ExtendWith(MockitoExtension.class)
class CreateReservationServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private ReservationMapper reservationMapper;

    @InjectMocks
    private CreateReservationService createReservationService;

    private Reservation sampleDto;
    private com.pimvanleeuwen.the_harry_list_backend.model.Reservation sampleEntity;

    @BeforeEach
    void setUp() {
        sampleDto = createSampleDto();
        sampleEntity = createSampleEntity();
    }

    @Test
    void execute_shouldCreateReservationSuccessfully() {
        // Given
        when(reservationMapper.toEntity(any(Reservation.class))).thenReturn(sampleEntity);
        when(reservationRepository.save(any())).thenReturn(sampleEntity);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When
        ResponseEntity<Reservation> response = createReservationService.execute(sampleDto);

        // Then
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(reservationRepository, times(1)).save(any());
    }

    @Test
    void execute_shouldSetStatusToPending() {
        // Given
        com.pimvanleeuwen.the_harry_list_backend.model.Reservation capturedEntity =
                new com.pimvanleeuwen.the_harry_list_backend.model.Reservation();

        when(reservationMapper.toEntity(any(Reservation.class))).thenReturn(capturedEntity);
        when(reservationRepository.save(any())).thenAnswer(invocation -> {
            com.pimvanleeuwen.the_harry_list_backend.model.Reservation saved = invocation.getArgument(0);
            assertEquals(ReservationStatus.PENDING, saved.getStatus());
            return saved;
        });
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When
        createReservationService.execute(sampleDto);

        // Then
        verify(reservationRepository, times(1)).save(any());
    }

    private Reservation createSampleDto() {
        return Reservation.builder()
                .contactName("John Doe")
                .email("john@example.com")
                .phoneNumber("+31612345678")
                .eventTitle("Test Event")
                .eventType(EventType.BORREL)
                .organizerType(OrganizerType.ASSOCIATION)
                .expectedGuests(50)
                .eventDate(LocalDate.of(2026, 3, 15))
                .startTime(LocalTime.of(16, 0))
                .endTime(LocalTime.of(22, 0))
                .location(BarLocation.HUBBLE)
                .paymentOption(PaymentOption.INDIVIDUAL)
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
        entity.setPaymentOption(PaymentOption.INDIVIDUAL);
        entity.setStatus(ReservationStatus.PENDING);
        return entity;
    }
}

