package com.pimvanleeuwen.the_harry_list_backend.service;

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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for DeleteReservationService.
 */
@ExtendWith(MockitoExtension.class)
class DeleteReservationServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @InjectMocks
    private DeleteReservationService deleteReservationService;

    private com.pimvanleeuwen.the_harry_list_backend.model.Reservation sampleReservation;

    @BeforeEach
    void setUp() {
        sampleReservation = createSampleReservation();
    }

    @Test
    void execute_shouldDeleteReservationWhenExists() {
        // Given
        Long id = 1L;
        when(reservationRepository.findById(id)).thenReturn(Optional.of(sampleReservation));
        doNothing().when(reservationRepository).deleteById(id);

        // When
        ResponseEntity<Void> response = deleteReservationService.execute(id);

        // Then
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(reservationRepository, times(1)).deleteById(id);
    }

    @Test
    void execute_shouldReturnNotFoundWhenReservationDoesNotExist() {
        // Given
        Long id = 999L;
        when(reservationRepository.findById(id)).thenReturn(Optional.empty());

        // When
        ResponseEntity<Void> response = deleteReservationService.execute(id);

        // Then
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(reservationRepository, never()).deleteById(any());
    }

    private com.pimvanleeuwen.the_harry_list_backend.model.Reservation createSampleReservation() {
        com.pimvanleeuwen.the_harry_list_backend.model.Reservation reservation =
                new com.pimvanleeuwen.the_harry_list_backend.model.Reservation();
        reservation.setId(1L);
        reservation.setContactName("John Doe");
        reservation.setEmail("john@example.com");
        reservation.setPhoneNumber("+31612345678");
        reservation.setEventTitle("Test Event");
        reservation.setEventType(EventType.BORREL);
        reservation.setOrganizerType(OrganizerType.ASSOCIATION);
        reservation.setExpectedGuests(50);
        reservation.setEventDate(LocalDate.of(2026, 3, 15));
        reservation.setStartTime(LocalTime.of(16, 0));
        reservation.setEndTime(LocalTime.of(22, 0));
        reservation.setLocation(BarLocation.HUBBLE);
        reservation.setPaymentOption(PaymentOption.INDIVIDUAL);
        reservation.setStatus(ReservationStatus.PENDING);
        return reservation;
    }
}

