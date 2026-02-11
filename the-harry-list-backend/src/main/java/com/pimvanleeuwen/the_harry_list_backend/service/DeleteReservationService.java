package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class DeleteReservationService implements Command<Long, Void> {

    private static final Logger log = LoggerFactory.getLogger(DeleteReservationService.class);

    private final ReservationRepository reservationRepository;

    public DeleteReservationService(ReservationRepository reservationRepository) {
        this.reservationRepository = reservationRepository;
    }

    @Override
    public ResponseEntity<Void> execute(Long id) {
        log.info("Deleting reservation with ID: {}", id);

        if (!reservationRepository.existsById(id)) {
            log.warn("Reservation with ID {} not found", id);
            return ResponseEntity.notFound().build();
        }

        reservationRepository.deleteById(id);

        log.info("Deleted reservation with ID: {}", id);

        return ResponseEntity.noContent().build();
    }
}
