package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class CreateReservationService implements Command<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation, com.pimvanleeuwen.the_harry_list_backend.dto.Reservation> {

    private static final Logger log = LoggerFactory.getLogger(CreateReservationService.class);

    private final ReservationRepository reservationRepository;
    private final ReservationMapper reservationMapper;

    public CreateReservationService(ReservationRepository reservationRepository, ReservationMapper reservationMapper) {
        this.reservationRepository = reservationRepository;
        this.reservationMapper = reservationMapper;
    }

    @Override
    public ResponseEntity<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation> execute(com.pimvanleeuwen.the_harry_list_backend.dto.Reservation input) {
        log.info("Creating new reservation for: {} at {}", input.getContactName(), input.getLocation());

        // Convert DTO to entity
        Reservation entity = reservationMapper.toEntity(input);

        // Set initial status
        entity.setStatus(ReservationStatus.PENDING);

        // Save to database
        Reservation savedEntity = reservationRepository.save(entity);

        log.info("Created reservation with ID: {}", savedEntity.getId());

        // Convert back to DTO and return
        return ResponseEntity.status(HttpStatus.CREATED).body(reservationMapper.toDto(savedEntity));
    }
}
