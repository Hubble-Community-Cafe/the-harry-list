package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.exception.NotFoundException;
import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;

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
    void findAll_shouldReturnAllReservations() {
        // Given
        List<com.pimvanleeuwen.the_harry_list_backend.model.Reservation> entities =
                Arrays.asList(sampleEntity, createAnotherEntity());

        when(reservationRepository.findAll()).thenReturn(entities);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When
        List<Reservation> response = getReservationService.findAll();

        // Then
        assertNotNull(response);
        assertEquals(2, response.size());
        verify(reservationRepository, times(1)).findAll();
    }

    @Test
    void findAll_shouldReturnEmptyListWhenNoReservations() {
        // Given
        when(reservationRepository.findAll()).thenReturn(Arrays.asList());

        // When
        List<Reservation> response = getReservationService.findAll();

        // Then
        assertNotNull(response);
        assertTrue(response.isEmpty());
    }

    @Test
    void findById_shouldReturnReservationWhenFound() {
        // Given
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleEntity));
        when(reservationMapper.toDto(sampleEntity)).thenReturn(sampleDto);

        // When
        Reservation response = getReservationService.findById(1L);

        // Then
        assertNotNull(response);
        assertEquals(sampleDto.getContactName(), response.getContactName());
    }

    @Test
    void findById_shouldThrowNotFoundWhenReservationDoesNotExist() {
        // Given
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        // When
        NotFoundException thrown = assertThrows(NotFoundException.class,
                () -> getReservationService.findById(999L));

        // Then
        assertEquals("Reservation 999 not found", thrown.getMessage());
    }

    private Reservation createSampleDto() {
        return Reservation.builder()
                .id(1L)
                .contactName("John Doe")
                .email("john@example.com")
                .eventTitle("Test Event")
                .description("Test description")
                .specialActivities(Set.of(SpecialActivity.GRADUATION))
                .location(BarLocation.HUBBLE)
                .seatingArea(SeatingArea.INSIDE)
                .paymentOption(PaymentOption.INDIVIDUAL)
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
        entity.setDescription("Test description");
        entity.setSeatingArea(SeatingArea.INSIDE);
        entity.setLocation(BarLocation.HUBBLE);
        entity.setPaymentOption(PaymentOption.INDIVIDUAL);
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
        entity.setDescription("Another description");
        entity.setSeatingArea(SeatingArea.OUTSIDE);
        entity.setLocation(BarLocation.METEOR);
        entity.setPaymentOption(PaymentOption.INVOICE);
        entity.setStatus(ReservationStatus.CONFIRMED);
        return entity;
    }
}
