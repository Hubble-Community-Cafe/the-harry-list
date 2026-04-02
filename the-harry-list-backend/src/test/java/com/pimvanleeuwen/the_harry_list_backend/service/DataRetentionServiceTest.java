package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DataRetentionServiceTest {

    private DataRetentionService serviceWithDays(ReservationRepository repo, int days) {
        return new DataRetentionService(repo, days);
    }

    private Reservation reservation(long id, LocalDate eventDate) {
        Reservation r = new Reservation();
        r.setId(id);
        r.setEventTitle("Test Event " + id);
        r.setContactName("John Doe");
        r.setEmail("john@example.com");
        r.setEventDate(eventDate);
        r.setLocation(BarLocation.HUBBLE);
        r.setStatus(ReservationStatus.COMPLETED);
        return r;
    }

    // --- Configuration ---

    @Test
    void isEnabled_shouldReturnTrueWhenRetentionDaysPositive() {
        var repo = mock(ReservationRepository.class);
        assertTrue(serviceWithDays(repo, 365).isEnabled());
        assertTrue(serviceWithDays(repo, 1).isEnabled());
    }

    @Test
    void isEnabled_shouldReturnFalseWhenRetentionDaysZero() {
        var repo = mock(ReservationRepository.class);
        assertFalse(serviceWithDays(repo, 0).isEnabled());
    }

    @Test
    void getRetentionDays_shouldReturnConfiguredValue() {
        var repo = mock(ReservationRepository.class);
        assertEquals(365, serviceWithDays(repo, 365).getRetentionDays());
        assertEquals(180, serviceWithDays(repo, 180).getRetentionDays());
    }

    // --- countEligibleForDeletion ---

    @Test
    void countEligibleForDeletion_shouldQueryRepositoryWithCorrectCutoff() {
        var repo = mock(ReservationRepository.class);
        when(repo.countByEventDateBefore(any())).thenReturn(5L);

        long count = serviceWithDays(repo, 365).countEligibleForDeletion();

        assertEquals(5L, count);

        ArgumentCaptor<LocalDate> cutoffCaptor = ArgumentCaptor.forClass(LocalDate.class);
        verify(repo).countByEventDateBefore(cutoffCaptor.capture());
        LocalDate expectedCutoff = LocalDate.now().minusDays(365);
        assertEquals(expectedCutoff, cutoffCaptor.getValue());
    }

    @Test
    void countEligibleForDeletion_shouldReturnZeroWhenDisabled() {
        var repo = mock(ReservationRepository.class);
        long count = serviceWithDays(repo, 0).countEligibleForDeletion();

        assertEquals(0L, count);
        verifyNoInteractions(repo);
    }

    // --- purgeExpiredReservations ---

    @Test
    void purge_shouldDeleteExpiredReservations() {
        var repo = mock(ReservationRepository.class);
        LocalDate cutoff = LocalDate.now().minusDays(365);
        List<Reservation> expired = List.of(
                reservation(1L, cutoff.minusDays(1)),
                reservation(2L, cutoff.minusDays(30))
        );
        when(repo.findByEventDateBefore(any())).thenReturn(expired);

        serviceWithDays(repo, 365).purgeExpiredReservations();

        verify(repo).deleteAll(expired);
    }

    @Test
    void purge_shouldUseCutoffBasedOnRetentionDays() {
        var repo = mock(ReservationRepository.class);
        when(repo.findByEventDateBefore(any())).thenReturn(List.of());

        serviceWithDays(repo, 180).purgeExpiredReservations();

        ArgumentCaptor<LocalDate> cutoffCaptor = ArgumentCaptor.forClass(LocalDate.class);
        verify(repo).findByEventDateBefore(cutoffCaptor.capture());
        assertEquals(LocalDate.now().minusDays(180), cutoffCaptor.getValue());
    }

    @Test
    void purge_shouldDoNothingWhenDisabled() {
        var repo = mock(ReservationRepository.class);

        serviceWithDays(repo, 0).purgeExpiredReservations();

        verifyNoInteractions(repo);
    }

    @Test
    void purge_shouldDoNothingWhenNoExpiredReservations() {
        var repo = mock(ReservationRepository.class);
        when(repo.findByEventDateBefore(any())).thenReturn(List.of());

        serviceWithDays(repo, 365).purgeExpiredReservations();

        verify(repo).findByEventDateBefore(any());
        verify(repo, never()).deleteAll(any(List.class));
    }

    @Test
    void purge_shouldOnlyDeleteReservationsBeforeCutoff() {
        var repo = mock(ReservationRepository.class);
        int retentionDays = 365;
        LocalDate cutoff = LocalDate.now().minusDays(retentionDays);

        // Simulate repo returning only reservations before cutoff (as a real query would)
        List<Reservation> expiredOnly = List.of(
                reservation(1L, cutoff.minusDays(1))
        );
        when(repo.findByEventDateBefore(cutoff)).thenReturn(expiredOnly);

        serviceWithDays(repo, retentionDays).purgeExpiredReservations();

        // Exactly those reservations are deleted
        verify(repo).deleteAll(expiredOnly);
    }

    @Test
    void purge_shouldDeleteMultipleReservationsInOneBatch() {
        var repo = mock(ReservationRepository.class);
        LocalDate cutoff = LocalDate.now().minusDays(365);
        List<Reservation> expired = List.of(
                reservation(1L, cutoff.minusDays(1)),
                reservation(2L, cutoff.minusDays(90)),
                reservation(3L, cutoff.minusDays(365))
        );
        when(repo.findByEventDateBefore(any())).thenReturn(expired);

        serviceWithDays(repo, 365).purgeExpiredReservations();

        ArgumentCaptor<List<Reservation>> deletedCaptor = ArgumentCaptor.forClass(List.class);
        verify(repo).deleteAll(deletedCaptor.capture());
        assertEquals(3, deletedCaptor.getValue().size());
    }
}
