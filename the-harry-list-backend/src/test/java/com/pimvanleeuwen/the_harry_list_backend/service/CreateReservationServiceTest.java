package com.pimvanleeuwen.the_harry_list_backend.service;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
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

    @Mock
    private ConstraintValidationService constraintValidationService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private CreateReservationService createReservationService;

    private Reservation sampleDto;
    private com.pimvanleeuwen.the_harry_list_backend.model.Reservation sampleEntity;

    private ListAppender<ILoggingEvent> analyticsAppender;
    private ListAppender<ILoggingEvent> serviceAppender;
    private Logger analyticsLogger;
    private Logger serviceLogger;

    @BeforeEach
    void setUp() {
        sampleDto = createSampleDto();
        sampleEntity = createSampleEntity();

        analyticsLogger = (Logger) LoggerFactory.getLogger("analytics");
        serviceLogger = (Logger) LoggerFactory.getLogger(CreateReservationService.class);
        analyticsAppender = attachAppender(analyticsLogger);
        serviceAppender = attachAppender(serviceLogger);
    }

    @AfterEach
    void tearDown() {
        analyticsLogger.detachAppender(analyticsAppender);
        serviceLogger.detachAppender(serviceAppender);
    }

    private static ListAppender<ILoggingEvent> attachAppender(Logger logger) {
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        return appender;
    }

    @Test
    void execute_shouldCreateReservationSuccessfully() {
        // Given
        when(constraintValidationService.validate(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of());
        when(reservationMapper.toEntity(any(Reservation.class))).thenReturn(sampleEntity);
        when(reservationRepository.save(any())).thenReturn(sampleEntity);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When
        ResponseEntity<Reservation> response = createReservationService.execute(sampleDto);

        // Then
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(reservationRepository, times(1)).save(any());
        verify(auditService).recordCreate(eq(AuditEntityType.RESERVATION), eq(1L), any(), any(), any());
    }

    @Test
    void execute_shouldEmitExactlyOnePrivacySafeAnalyticsLine() {
        // Given
        when(constraintValidationService.validate(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of());
        when(reservationMapper.toEntity(any(Reservation.class))).thenReturn(sampleEntity);
        when(reservationRepository.save(any())).thenReturn(sampleEntity);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When
        createReservationService.execute(sampleDto);

        // Then — exactly one line, in the agreed PII-free contract format.
        List<ILoggingEvent> events = analyticsAppender.list;
        assertEquals(1, events.size(), "Exactly one analytics line per reservation");
        assertEquals("APP_ANALYTICS event=reservation_created bar=HUBBLE",
                events.get(0).getFormattedMessage());
    }

    @Test
    void execute_shouldFallBackToNoPreferenceWhenLocationNull() {
        // Given a reservation persisted without a location.
        sampleEntity.setLocation(null);
        when(constraintValidationService.validate(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of());
        when(reservationMapper.toEntity(any(Reservation.class))).thenReturn(sampleEntity);
        when(reservationRepository.save(any())).thenReturn(sampleEntity);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When
        createReservationService.execute(sampleDto);

        // Then
        assertEquals("APP_ANALYTICS event=reservation_created bar=NO_PREFERENCE",
                analyticsAppender.list.get(0).getFormattedMessage());
    }

    @Test
    void execute_shouldNeverLogGuestPii() {
        // Given
        when(constraintValidationService.validate(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of());
        when(reservationMapper.toEntity(any(Reservation.class))).thenReturn(sampleEntity);
        when(reservationRepository.save(any())).thenReturn(sampleEntity);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When
        createReservationService.execute(sampleDto);

        // Then — no name/email/phone in any analytics or service log line.
        assertNoPii(analyticsAppender);
        assertNoPii(serviceAppender);
    }

    private void assertNoPii(ListAppender<ILoggingEvent> appender) {
        for (ILoggingEvent event : appender.list) {
            String msg = event.getFormattedMessage();
            assertFalse(msg.contains("John Doe"), "name leaked into log: " + msg);
            assertFalse(msg.contains("john@example.com"), "email leaked into log: " + msg);
            assertFalse(msg.contains("+31612345678"), "phone leaked into log: " + msg);
        }
    }

    @Test
    void execute_shouldNotAuditWhenConstraintViolation() {
        when(constraintValidationService.validate(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of("violation"));

        assertThrows(IllegalArgumentException.class, () -> createReservationService.execute(sampleDto));
        verifyNoInteractions(auditService);
    }

    @Test
    void execute_shouldSetStatusToPending() {
        // Given
        when(constraintValidationService.validate(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of());

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

    @Test
    void execute_shouldRejectWhenConstraintViolation() {
        // Given
        when(constraintValidationService.validate(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of("Catering and à la carte dining cannot be combined"));

        // When / Then
        assertThrows(IllegalArgumentException.class, () -> createReservationService.execute(sampleDto));
        verify(reservationRepository, never()).save(any());
    }

    private Reservation createSampleDto() {
        return Reservation.builder()
                .contactName("John Doe")
                .email("john@example.com")
                .phoneNumber("+31612345678")
                .eventTitle("Test Event")
                .description("Test description")
                .specialActivities(Set.of(SpecialActivity.GRADUATION))
                .expectedGuests(50)
                .eventDate(LocalDate.of(2026, 3, 15))
                .startTime(LocalTime.of(16, 0))
                .endTime(LocalTime.of(22, 0))
                .location(BarLocation.HUBBLE)
                .seatingArea(SeatingArea.INSIDE)
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
        entity.setDescription("Test description");
        entity.setSpecialActivities(Set.of(SpecialActivity.GRADUATION));
        entity.setSeatingArea(SeatingArea.INSIDE);
        entity.setLocation(BarLocation.HUBBLE);
        entity.setPaymentOption(PaymentOption.INDIVIDUAL);
        entity.setStatus(ReservationStatus.PENDING);
        return entity;
    }
}
