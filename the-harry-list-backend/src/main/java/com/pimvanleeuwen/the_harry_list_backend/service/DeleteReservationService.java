package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class DeleteReservationService implements Command<Void, Reservation> {

    @Override
    public ResponseEntity<Reservation> execute(Void input) {
        return ResponseEntity.status(HttpStatus.OK).body(null);
    }
}
