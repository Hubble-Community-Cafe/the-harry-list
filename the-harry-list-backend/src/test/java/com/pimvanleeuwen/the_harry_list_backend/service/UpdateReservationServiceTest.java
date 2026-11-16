package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange;
import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.exception.BusinessRuleException;
import com.pimvanleeuwen.the_harry_list_backend.exception.NotFoundException;
import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionSynchronizationUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UpdateReservationService. The mapper is the real one, so these tests cover
 * which fields an edit may change and which it must leave as stored.
 */
@ExtendWith(MockitoExtension.class)
class UpdateReservationServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Spy
    private ReservationMapper reservationMapper = new ReservationMapper();

    @Mock
    private AuditService auditService;

    @Mock
    private EmailNotificationService emailService;

    @Mock
    private ConstraintValidationService constraintValidationService;

    @InjectMocks
    private UpdateReservationService updateReservationService;

    private Reservation sampleDto;
    private com.pimvanleeuwen.the_harry_list_backend.model.Reservation existingEntity;

    @BeforeEach
    void setUp() {
        sampleDto = createSampleDto();
        existingEntity = createExistingEntity();
        // emailService is an optional (@Autowired(required=false)) field, not a constructor arg, so
        // @InjectMocks (constructor injection) doesn't set it; wire the mock in explicitly.
        ReflectionTestUtils.setField(updateReservationService, "emailService", emailService);
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    private void givenStoredReservation() {
        sampleDto.setId(1L);
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(existingEntity));
        lenient().when(reservationRepository.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void update_shouldEditTheStoredRecordInPlace() {
        givenStoredReservation();

        Reservation response = updateReservationService.update(sampleDto, true, null);

        // The loaded record itself is saved, not a rebuilt copy.
        verify(reservationRepository).saveAndFlush(same(existingEntity));
        assertEquals("John Doe", existingEntity.getContactName());
        assertEquals(BarLocation.HUBBLE, existingEntity.getLocation());
        assertEquals("John Doe", response.getContactName());
    }

    @Test
    void update_shouldKeepEverythingTheEditFormDoesNotOwn() {
        existingEntity.setStatus(ReservationStatus.CONFIRMED);
        existingEntity.setConfirmationNumber("ABC123");
        existingEntity.setConfirmedBy("Ann");
        existingEntity.setTermsAccepted(true);
        existingEntity.setCateringArranged(true);
        existingEntity.setInternalNotes("Call before noon");
        givenStoredReservation();
        // The edit form leaves internal notes out, and says nothing about terms or catering.
        sampleDto.setInternalNotes(null);
        sampleDto.setTermsAccepted(null);
        sampleDto.setCateringArranged(false);

        updateReservationService.update(sampleDto, false, null);

        assertEquals(ReservationStatus.CONFIRMED, existingEntity.getStatus());
        assertEquals("ABC123", existingEntity.getConfirmationNumber());
        assertEquals("Ann", existingEntity.getConfirmedBy());
        assertEquals(LocalDateTime.of(2026, 1, 1, 10, 0), existingEntity.getCreatedAt());
        assertTrue(existingEntity.getTermsAccepted());
        assertTrue(existingEntity.isCateringArranged());
        assertEquals("Call before noon", existingEntity.getInternalNotes());
    }

    @Test
    void update_shouldReplaceInternalNotesWhenSent() {
        existingEntity.setInternalNotes("Old note");
        givenStoredReservation();
        sampleDto.setInternalNotes("New note");

        updateReservationService.update(sampleDto, false, null);

        assertEquals("New note", existingEntity.getInternalNotes());
    }

    @Test
    @SuppressWarnings("unchecked")
    void update_shouldRecordFieldLevelDiff() {
        givenStoredReservation();
        existingEntity.setTermsAccepted(true);
        existingEntity.setCateringArranged(true);

        updateReservationService.update(sampleDto, true, null);

        ArgumentCaptor<List<FieldChange>> captor = ArgumentCaptor.forClass(List.class);
        verify(auditService).recordUpdate(eq(AuditEntityType.RESERVATION), eq(1L), any(), captor.capture(), any());
        List<FieldChange> changes = captor.getValue();
        assertTrue(changes.stream().anyMatch(c -> c.field().equals("contactName")
                && "Original Name".equals(c.oldValue()) && "John Doe".equals(c.newValue())));
        // Fields the edit does not touch never show up as spurious changes.
        assertTrue(changes.stream().noneMatch(c -> List.of("termsAccepted", "cateringArranged", "status",
                "confirmationNumber", "createdAt", "updatedAt").contains(c.field())));
    }

    @Test
    void update_shouldForwardCustomMessageToEmail() {
        givenStoredReservation();

        updateReservationService.update(sampleDto, true, "We moved your booking to the terrace.");

        verify(emailService).sendReservationUpdatedEmail(any(), eq("We moved your booking to the terrace."));
    }

    @Test
    void update_shouldNotSendEmailWhenDisabled() {
        givenStoredReservation();

        updateReservationService.update(sampleDto, false, "ignored message");

        verify(emailService, never()).sendReservationUpdatedEmail(any(), any());
    }

    @Test
    void update_shouldSendEmailOnlyAfterTheTransactionCommits() {
        givenStoredReservation();
        TransactionSynchronizationManager.initSynchronization();

        updateReservationService.update(sampleDto, true, null);
        verify(emailService, never()).sendReservationUpdatedEmail(any(), any());

        TransactionSynchronizationUtils.triggerAfterCommit();
        verify(emailService).sendReservationUpdatedEmail(same(existingEntity), isNull());
    }

    @Test
    void update_shouldRejectMissingId() {
        sampleDto.setId(null);

        assertThrows(BusinessRuleException.class, () -> updateReservationService.update(sampleDto, true, null));

        verify(reservationRepository, never()).saveAndFlush(any());
    }

    @Test
    void update_shouldThrowNotFoundWhenReservationDoesNotExist() {
        sampleDto.setId(999L);
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> updateReservationService.update(sampleDto, true, null));

        verify(reservationRepository, never()).saveAndFlush(any());
    }

    @Test
    void update_shouldNotApplyFormRules() {
        // Policy: staff edits may override the public form's rules (constraints, blocked
        // periods, retired activities), e.g. to fit a group in after talking to the guest.
        // Only new submissions are checked, in CreateReservationService.
        givenStoredReservation();
        sampleDto.setSpecialActivities(Set.of(SpecialActivity.PRIVATE_EVENT));

        assertDoesNotThrow(() -> updateReservationService.update(sampleDto, false, null));

        assertEquals(Set.of(SpecialActivity.PRIVATE_EVENT), existingEntity.getSpecialActivities());
        verifyNoInteractions(constraintValidationService);
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
