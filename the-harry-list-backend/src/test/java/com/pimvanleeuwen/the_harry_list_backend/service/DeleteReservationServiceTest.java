package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

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

    @Test
    void execute_shouldDeleteReservationWhenExists() {
        // Given
        Long id = 1L;
        when(reservationRepository.existsById(id)).thenReturn(true);
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
        when(reservationRepository.existsById(id)).thenReturn(false);

        // When
        ResponseEntity<Void> response = deleteReservationService.execute(id);

        // Then
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(reservationRepository, never()).deleteById(any());
    }
}

