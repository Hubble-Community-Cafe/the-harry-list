package com.pimvanleeuwen.the_harry_list_backend.controller.open;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.service.CreateReservationService;
import com.pimvanleeuwen.the_harry_list_backend.service.DeleteReservationService;
import com.pimvanleeuwen.the_harry_list_backend.service.GetReservationService;
import com.pimvanleeuwen.the_harry_list_backend.service.UpdateReservationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
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

    @GetMapping("/reservations/all")
    public ResponseEntity<List<Reservation>> getReservations() {

        System.out.println("GET /reservations/all called");
        return getReservationService.execute(null);
    }

    @PostMapping
    public ResponseEntity<Reservation> createReservation(@RequestBody Reservation reservation) {
        return createReservationService.execute(null);
    }

    @PutMapping
    public ResponseEntity<Reservation> updateReservation(@RequestBody Reservation reservation) {
        return updateReservationService.execute(null);
    }

    @DeleteMapping
    public ResponseEntity<Reservation> deleteReservation(@RequestParam long id) {
        return deleteReservationService.execute(null);
    }

}
