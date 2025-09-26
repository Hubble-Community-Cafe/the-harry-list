package com.pimvanleeuwen.the_harry_list_backend.controller.open;

import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.CompletableFuture;

@RestController
public class ReservationController {

    @GetMapping("/reservations/all")
    public Reservation getReservations() {
        return new Reservation(1L);
    }


}
