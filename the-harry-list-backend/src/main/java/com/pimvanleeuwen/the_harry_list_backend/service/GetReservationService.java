package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GetReservationService implements Query<Void, List<Reservation>> {

    private final ReservationRepository reservationRepository;

    public GetReservationService(ReservationRepository reservationRepository) {
        this.reservationRepository = reservationRepository;
    }

    @Override
    public ResponseEntity<List<Reservation>> execute(Void input) {
        List<Reservation> reservationList = reservationRepository.findAll();

        System.out.println("Retrieved " + reservationList.size() + " reservations from the database.");

        return ResponseEntity.status(HttpStatus.OK).body(reservationList);
    }
}
