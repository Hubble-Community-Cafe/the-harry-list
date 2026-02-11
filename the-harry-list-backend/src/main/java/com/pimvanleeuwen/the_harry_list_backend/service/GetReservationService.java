package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class GetReservationService implements Query<Void, List<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation>> {

    private static final Logger log = LoggerFactory.getLogger(GetReservationService.class);

    private final ReservationRepository reservationRepository;
    private final ReservationMapper reservationMapper;

    public GetReservationService(ReservationRepository reservationRepository, ReservationMapper reservationMapper) {
        this.reservationRepository = reservationRepository;
        this.reservationMapper = reservationMapper;
    }

    @Override
    public ResponseEntity<List<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation>> execute(Void input) {
        List<Reservation> reservationList = reservationRepository.findAll();

        log.info("Retrieved {} reservations from the database.", reservationList.size());

        List<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation> dtoList = reservationList.stream()
                .map(reservationMapper::toDto)
                .collect(Collectors.toList());

        return ResponseEntity.status(HttpStatus.OK).body(dtoList);
    }

    /**
     * Get a single reservation by ID.
     */
    public ResponseEntity<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation> getById(Long id) {
        log.info("Fetching reservation with ID: {}", id);

        Optional<Reservation> reservation = reservationRepository.findById(id);

        if (reservation.isPresent()) {
            return ResponseEntity.ok(reservationMapper.toDto(reservation.get()));
        } else {
            log.warn("Reservation with ID {} not found", id);
            return ResponseEntity.notFound().build();
        }
    }
}
