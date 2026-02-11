package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UpdateReservationService implements Command<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation, com.pimvanleeuwen.the_harry_list_backend.dto.Reservation> {

    private static final Logger log = LoggerFactory.getLogger(UpdateReservationService.class);

    private final ReservationRepository reservationRepository;
    private final ReservationMapper reservationMapper;

    public UpdateReservationService(ReservationRepository reservationRepository, ReservationMapper reservationMapper) {
        this.reservationRepository = reservationRepository;
        this.reservationMapper = reservationMapper;
    }

    @Override
    public ResponseEntity<com.pimvanleeuwen.the_harry_list_backend.dto.Reservation> execute(com.pimvanleeuwen.the_harry_list_backend.dto.Reservation input) {
        if (input.getId() == null) {
            log.error("Cannot update reservation without ID");
            return ResponseEntity.badRequest().build();
        }

        log.info("Updating reservation with ID: {}", input.getId());

        Optional<Reservation> existingReservation = reservationRepository.findById(input.getId());

        if (existingReservation.isEmpty()) {
            log.warn("Reservation with ID {} not found", input.getId());
            return ResponseEntity.notFound().build();
        }

        // Convert DTO to entity, preserving the existing entity's metadata
        Reservation entity = reservationMapper.toEntity(input);
        entity.setId(input.getId());
        entity.setStatus(existingReservation.get().getStatus()); // Preserve status
        entity.setCreatedAt(existingReservation.get().getCreatedAt()); // Preserve creation time

        // Save updated entity
        Reservation savedEntity = reservationRepository.save(entity);

        log.info("Updated reservation with ID: {}", savedEntity.getId());

        return ResponseEntity.ok(reservationMapper.toDto(savedEntity));
    }
}
