package com.pimvanleeuwen.the_harry_list_backend.controller.open;

import com.pimvanleeuwen.the_harry_list_backend.dto.PublicReservationRequest;
import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.dto.ReservationSubmissionResponse;
import com.pimvanleeuwen.the_harry_list_backend.service.CreateReservationService;
import com.pimvanleeuwen.the_harry_list_backend.service.RecaptchaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Public controller for reservation submissions.
 * No authentication required - anyone can submit a reservation request.
 * After submission, users cannot view or edit their reservation.
 * Protected by Google reCAPTCHA v3 to prevent bot submissions.
 */
@RestController
@RequestMapping("/api/public/reservations")
@Tag(name = "Public - Reservations", description = "Public endpoint for submitting reservation requests (no login required)")
public class PublicReservationController {

    private static final Logger logger = LoggerFactory.getLogger(PublicReservationController.class);
    private static final String RECAPTCHA_ACTION = "submit_reservation";

    private final CreateReservationService createReservationService;
    private final RecaptchaService recaptchaService;

    public PublicReservationController(
            CreateReservationService createReservationService,
            RecaptchaService recaptchaService) {
        this.createReservationService = createReservationService;
        this.recaptchaService = recaptchaService;
    }

    @PostMapping
    @Operation(
        summary = "Submit a reservation request",
        description = "Submit a new reservation request. No login required. " +
                      "Requires a valid reCAPTCHA v3 token for bot protection. " +
                      "After submission, you will receive a confirmation with your reservation ID. " +
                      "You cannot view or edit the reservation - staff will contact you via email."
    )
    public ResponseEntity<?> submitReservation(@Valid @RequestBody PublicReservationRequest request) {
        // Verify reCAPTCHA token
        if (recaptchaService.isEnabled()) {
            if (!recaptchaService.verifyToken(request.getRecaptchaToken(), RECAPTCHA_ACTION)) {
                logger.warn("reCAPTCHA verification failed for reservation request from: {}", request.getEmail());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of(
                            "error", "RECAPTCHA_FAILED",
                            "message", "reCAPTCHA verification failed. Please try again."
                        ));
            }
        }

        // Convert to Reservation DTO and process
        Reservation reservation = request.toReservation();
        ResponseEntity<Reservation> result = createReservationService.execute(reservation);

        if (result.getBody() != null) {
            ReservationSubmissionResponse response = new ReservationSubmissionResponse(
                result.getBody().getConfirmationNumber(),
                result.getBody().getEventTitle(),
                result.getBody().getContactName(),
                result.getBody().getEmail(),
                "Your reservation request has been submitted successfully. " +
                "We will review your request and contact you at " + result.getBody().getEmail() + " soon."
            );
            return ResponseEntity.status(result.getStatusCode()).body(response);
        }

        return ResponseEntity.status(result.getStatusCode()).build();
    }

    @GetMapping("/recaptcha-status")
    @Operation(
        summary = "Check if reCAPTCHA is enabled",
        description = "Returns whether reCAPTCHA verification is required for submissions."
    )
    public ResponseEntity<Map<String, Boolean>> getRecaptchaStatus() {
        return ResponseEntity.ok(Map.of("enabled", recaptchaService.isEnabled()));
    }
}

