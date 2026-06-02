package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UpdateReservationService.
 */
@ExtendWith(MockitoExtension.class)
class UpdateReservationServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private ReservationMapper reservationMapper;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private UpdateReservationService updateReservationService;

    private Reservation sampleDto;
    private com.pimvanleeuwen.the_harry_list_backend.model.Reservation existingEntity;

    @BeforeEach
    void setUp() {
        sampleDto = createSampleDto();
        existingEntity = createExistingEntity();
    }

    @Test
    void execute_shouldUpdateReservationSuccessfully() {
        // Given
        sampleDto.setId(1L);
        com.pimvanleeuwen.the_harry_list_backend.model.Reservation updatedEntity = createExistingEntity();
        updatedEntity.setContactName("Updated Name");

        when(reservationRepository.findById(1L)).thenReturn(Optional.of(existingEntity));
        when(reservationMapper.toEntity(sampleDto)).thenReturn(updatedEntity);
        when(reservationRepository.save(any())).thenReturn(updatedEntity);
        when(reservationMapper.toDto(updatedEntity)).thenReturn(sampleDto);

        // When
        ResponseEntity<Reservation> response = updateReservationService.execute(sampleDto);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(reservationRepository, times(1)).save(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void execute_shouldRecordFieldLevelDiff() {
        // Given: only the contact name changes between existing and the incoming entity
        sampleDto.setId(1L);
        com.pimvanleeuwen.the_harry_list_backend.model.Reservation incoming = createExistingEntity();
        incoming.setContactName("Updated Name");

        when(reservationRepository.findById(1L)).thenReturn(Optional.of(existingEntity));
        when(reservationMapper.toEntity(sampleDto)).thenReturn(incoming);
        when(reservationRepository.save(any())).thenReturn(incoming);
        when(reservationMapper.toDto(incoming)).thenReturn(sampleDto);

        // When
        updateReservationService.execute(sampleDto);

        // Then
        ArgumentCaptor<java.util.List<com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange>> captor =
                ArgumentCaptor.forClass(java.util.List.class);
        verify(auditService).recordUpdate(eq(AuditEntityType.RESERVATION), eq(1L), any(), captor.capture(), any());
        assertTrue(captor.getValue().stream().anyMatch(c ->
                c.field().equals("contactName")
                        && "Original Name".equals(c.oldValue())
                        && "Updated Name".equals(c.newValue())));
    }

    @Test
    void execute_shouldReturnBadRequestWhenIdIsNull() {
        // Given
        sampleDto.setId(null);

        // When
        ResponseEntity<Reservation> response = updateReservationService.execute(sampleDto);

        // Then
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void execute_shouldReturnNotFoundWhenReservationDoesNotExist() {
        // Given
        sampleDto.setId(999L);
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        // When
        ResponseEntity<Reservation> response = updateReservationService.execute(sampleDto);

        // Then
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void execute_shouldPreserveStatusAndCreatedAt() {
        // Given
        sampleDto.setId(1L);
        existingEntity.setStatus(ReservationStatus.CONFIRMED);
        existingEntity.setCreatedAt(LocalDateTime.of(2026, 1, 1, 10, 0));

        com.pimvanleeuwen.the_harry_list_backend.model.Reservation updatedEntity =
                new com.pimvanleeuwen.the_harry_list_backend.model.Reservation();

        when(reservationRepository.findById(1L)).thenReturn(Optional.of(existingEntity));
        when(reservationMapper.toEntity(sampleDto)).thenReturn(updatedEntity);
        when(reservationRepository.save(any())).thenAnswer(invocation -> {
            com.pimvanleeuwen.the_harry_list_backend.model.Reservation saved = invocation.getArgument(0);
            // Verify that status and createdAt are preserved
            assertEquals(ReservationStatus.CONFIRMED, saved.getStatus());
            assertEquals(LocalDateTime.of(2026, 1, 1, 10, 0), saved.getCreatedAt());
            return saved;
        });
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When
        updateReservationService.execute(sampleDto);

        // Then
        verify(reservationRepository, times(1)).save(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void execute_shouldPreserveTermsAcceptedAndCateringArranged() {
        // Existing reservation has terms accepted and catering arranged...
        sampleDto.setId(1L);
        existingEntity.setTermsAccepted(true);
        existingEntity.setCateringArranged(true);

        // ...but the incoming edit payload (mapped) carries neither (form doesn't send them).
        com.pimvanleeuwen.the_harry_list_backend.model.Reservation incoming = createExistingEntity();
        incoming.setTermsAccepted(null);
        incoming.setCateringArranged(false);
        incoming.setContactName("Updated Name"); // one real change so an audit entry is recorded

        when(reservationRepository.findById(1L)).thenReturn(Optional.of(existingEntity));
        when(reservationMapper.toEntity(sampleDto)).thenReturn(incoming);
        when(reservationRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        updateReservationService.execute(sampleDto);

        // The saved entity keeps the preserved values...
        verify(reservationRepository).save(argThat(saved ->
                Boolean.TRUE.equals(saved.getTermsAccepted()) && saved.isCateringArranged()));

        // ...and neither shows up as a spurious audit change.
        ArgumentCaptor<java.util.List<com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange>> captor =
                ArgumentCaptor.forClass(java.util.List.class);
        verify(auditService).recordUpdate(any(), any(), any(), captor.capture(), any());
        assertTrue(captor.getValue().stream().noneMatch(c ->
                c.field().equals("termsAccepted") || c.field().equals("cateringArranged")));
    }

    private Reservation createSampleDto() {
        return Reservation.builder()
                .contactName("John Doe")
                .email("john@example.com")
                .eventTitle("Test Event")
                .description("Test description")
                .specialActivities(Set.of(SpecialActivity.GRADUATION))
                .eventDate(LocalDate.of(2026, 3, 15))
                .startTime(LocalTime.of(16, 0))
                .endTime(LocalTime.of(22, 0))
                .location(BarLocation.HUBBLE)
                .seatingArea(SeatingArea.INSIDE)
                .paymentOption(PaymentOption.INDIVIDUAL)
                .build();
    }

    private com.pimvanleeuwen.the_harry_list_backend.model.Reservation createExistingEntity() {
        com.pimvanleeuwen.the_harry_list_backend.model.Reservation entity =
                new com.pimvanleeuwen.the_harry_list_backend.model.Reservation();
        entity.setId(1L);
        entity.setContactName("Original Name");
        entity.setEmail("original@example.com");
        entity.setEventTitle("Original Event");
        entity.setDescription("Original description");
        entity.setSeatingArea(SeatingArea.OUTSIDE);
        entity.setLocation(BarLocation.METEOR);
        entity.setPaymentOption(PaymentOption.INVOICE);
        entity.setStatus(ReservationStatus.PENDING);
        entity.setCreatedAt(LocalDateTime.of(2026, 1, 1, 10, 0));
        return entity;
    }
}
