package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.exception.NotFoundException;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class GetReservationService {

    private static final Logger log = LoggerFactory.getLogger(GetReservationService.class);

    private final ReservationRepository reservationRepository;
    private final ReservationMapper reservationMapper;

    public GetReservationService(ReservationRepository reservationRepository, ReservationMapper reservationMapper) {
        this.reservationRepository = reservationRepository;
        this.reservationMapper = reservationMapper;
    }

    public List<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation> findAll() {
        List<Reservation> reservationList = reservationRepository.findAll();

        log.info("Retrieved {} reservations from the database.", reservationList.size());

        List<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation> dtoList = reservationList.stream()
                .map(reservationMapper::toDto)
                .collect(Collectors.toList());

        return dtoList;
    }

    /**
     * Get a single reservation by ID.
     * @throws NotFoundException when no reservation has this id
     */
    public com.pimvanleeuwen.the_harry_list_backend.dto.Reservation findById(Long id) {
        log.info("Fetching reservation with ID: {}", id);
        return reservationRepository.findById(id)
                .map(reservationMapper::toDto)
                .orElseThrow(() -> NotFoundException.of("Reservation", id));
    }
}
