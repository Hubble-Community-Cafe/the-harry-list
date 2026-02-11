package com.pimvanleeuwen.the_harry_list_backend.controller.open;

import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.dto.ReservationSubmissionResponse;
import com.pimvanleeuwen.the_harry_list_backend.service.CreateReservationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public controller for reservation submissions.
 * No authentication required - anyone can submit a reservation request.
 * After submission, users cannot view or edit their reservation.
 */
@RestController
@RequestMapping("/api/public/reservations")
@Tag(name = "Public - Reservations", description = "Public endpoint for submitting reservation requests (no login required)")
public class PublicReservationController {

    private final CreateReservationService createReservationService;

    public PublicReservationController(CreateReservationService createReservationService) {
        this.createReservationService = createReservationService;
    }

    @PostMapping
    @Operation(
        summary = "Submit a reservation request",
        description = "Submit a new reservation request. No login required. " +
                      "After submission, you will receive a confirmation with your reservation ID. " +
                      "You cannot view or edit the reservation - staff will contact you via email."
    )
    public ResponseEntity<ReservationSubmissionResponse> submitReservation(@Valid @RequestBody Reservation reservation) {
        ResponseEntity<Reservation> result = createReservationService.execute(reservation);

        if (result.getBody() != null) {
            ReservationSubmissionResponse response = new ReservationSubmissionResponse(
                result.getBody().getId(),
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
}

