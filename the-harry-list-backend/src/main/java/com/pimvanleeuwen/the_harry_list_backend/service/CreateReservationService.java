package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CreateReservationService implements Command<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation, com.pimvanleeuwen.the_harry_list_backend.dto.Reservation> {

    private static final Logger log = LoggerFactory.getLogger(CreateReservationService.class);
    /**
     * Dedicated, PII-free analytics logger scraped into Loki (job=app-analytics).
     * Only ever emit non-identifying, structured logfmt lines here never guest content.
     */
    private static final Logger analyticsLog = LoggerFactory.getLogger("analytics");

    private final ReservationRepository reservationRepository;
    private final ReservationMapper reservationMapper;
    private final ConstraintValidationService constraintValidationService;
    private final AuditService auditService;

    @Autowired(required = false)
    private EmailNotificationService emailService;

    public CreateReservationService(ReservationRepository reservationRepository,
                                     ReservationMapper reservationMapper,
                                     ConstraintValidationService constraintValidationService,
                                     AuditService auditService) {
        this.reservationRepository = reservationRepository;
        this.reservationMapper = reservationMapper;
        this.constraintValidationService = constraintValidationService;
        this.auditService = auditService;
    }

    @Override
    public ResponseEntity<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation> execute(com.pimvanleeuwen.the_harry_list_backend.dto.Reservation input) {
        return executeWithEmail(input, true);
    }

    /**
     * Create a reservation with optional email notification.
     * @param input The reservation DTO
     * @param sendEmail Whether to send email notification
     */
    public ResponseEntity<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation> executeWithEmail(
            com.pimvanleeuwen.the_harry_list_backend.dto.Reservation input, boolean sendEmail) {
        // Note: never log name/email/phone here. These logs are centralized (Loki), so guest
        // PII must not be written. Event/date/location/guests are operational context only.
        log.info("LOGGING reservation.submitted event='{}' date={} location={} guests={}",
                input.getEventTitle(), input.getEventDate(), input.getLocation(), input.getExpectedGuests());

        // Validate against dynamic constraints
        List<String> violations = constraintValidationService.validate(
                input.getSpecialActivities(),
                input.getLocation(),
                input.getSeatingArea(),
                input.getEventDate(),
                input.getStartTime(),
                input.getExpectedGuests());

        if (!violations.isEmpty()) {
            log.warn("Reservation rejected due to constraint violations: {}", violations);
            throw new IllegalArgumentException(String.join("; ", violations));
        }

        // Convert DTO to entity
        Reservation entity = reservationMapper.toEntity(input);

        // Set initial status
        entity.setStatus(ReservationStatus.PENDING);

        // Save to database
        Reservation savedEntity = reservationRepository.save(entity);

        log.info("LOGGING reservation.created id={} confirmation='{}' event='{}' date={} location={}",
                savedEntity.getId(), savedEntity.getConfirmationNumber(),
                savedEntity.getEventTitle(), savedEntity.getEventDate(), savedEntity.getLocation());

        // Privacy-safe analytics line scraped into Loki (job=app-analytics). PII-free by
        // contract: only coarse buckets (bar, weekday, time slot, guest band, lead time).
        analyticsLog.info(ReservationAnalytics.reservationCreatedLine(savedEntity));

        auditService.recordCreate(AuditEntityType.RESERVATION, savedEntity.getId(),
                savedEntity.getConfirmationNumber() + " - " + savedEntity.getEventTitle(),
                List.of(), "Reservation created");

        // Send email notification if enabled
        if (sendEmail && emailService != null) {
            try {
                emailService.sendReservationSubmittedEmail(savedEntity);
            } catch (Exception e) {
                log.error("Failed to send confirmation email, but reservation was created successfully", e);
            }
        }

        // Convert back to DTO and return
        return ResponseEntity.status(HttpStatus.CREATED).body(reservationMapper.toDto(savedEntity));
    }
}
