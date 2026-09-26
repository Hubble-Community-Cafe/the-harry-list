package com.pimvanleeuwen.the_harry_list_backend.controller.open;

import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.service.CreateReservationService;
import com.pimvanleeuwen.the_harry_list_backend.service.DeleteReservationService;
import com.pimvanleeuwen.the_harry_list_backend.service.GetReservationService;
import com.pimvanleeuwen.the_harry_list_backend.service.UpdateReservationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Staff/Admin controller for managing reservations.
 * Reads require the VIEWER role; creating, editing and deleting require EDITOR, matching
 * {@code canUpdateReservations} in the admin UI. The roles are resolved by
 * {@link com.pimvanleeuwen.the_harry_list_backend.filter.RoleAuthorizationFilter}.
 */
@RestController
@RequestMapping("/api/reservations")
@Tag(name = "Staff - Reservations", description = "Staff endpoints for managing reservations (login required)")
@SecurityRequirement(name = "basicAuth")
public class ReservationController {

    private final GetReservationService getReservationService;
    private final DeleteReservationService deleteReservationService;
    private final CreateReservationService createReservationService;
    private final UpdateReservationService updateReservationService;

    public ReservationController(GetReservationService getReservationService,
                                 DeleteReservationService deleteReservationService,
                                 CreateReservationService createReservationService,
                                 UpdateReservationService updateReservationService) {
        this.getReservationService = getReservationService;
        this.deleteReservationService = deleteReservationService;
        this.createReservationService = createReservationService;
        this.updateReservationService = updateReservationService;
    }

    @GetMapping
    @PreAuthorize("hasRole('VIEWER')")
    @Operation(summary = "Get all reservations", description = "Retrieve a list of all reservations (staff only)")
    public ResponseEntity<List<Reservation>> getReservations() {
        return getReservationService.execute(null);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('VIEWER')")
    @Operation(summary = "Get reservation by ID", description = "Retrieve a single reservation by its ID (staff only)")
    public ResponseEntity<Reservation> getReservationById(@PathVariable Long id) {
        return getReservationService.getById(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Create a reservation (staff)", description = "Create a new reservation as staff member")
    public ResponseEntity<Reservation> createReservation(@Valid @RequestBody Reservation reservation) {
        return createReservationService.execute(reservation);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Update a reservation", description = "Update an existing reservation (staff only). Set sendEmail=false to skip email notification. Optionally pass customMessage to add a note to the update email.")
    public ResponseEntity<Reservation> updateReservation(
            @PathVariable Long id,
            @Valid @RequestBody Reservation reservation,
            @RequestParam(required = false, defaultValue = "true") boolean sendEmail,
            @RequestParam(required = false) String customMessage) {
        reservation.setId(id);
        return updateReservationService.executeWithEmail(reservation, sendEmail, customMessage);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Delete a reservation", description = "Delete a reservation by its ID (staff only). Set sendEmail=false to skip email notification.")
    public ResponseEntity<Void> deleteReservation(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "true") boolean sendEmail) {
        return deleteReservationService.executeWithEmail(id, sendEmail);
    }

}
