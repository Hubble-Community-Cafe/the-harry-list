package com.pimvanleeuwen.the_harry_list_backend.repository;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long>, JpaSpecificationExecutor<Reservation> {

    List<Reservation> findByEventDateBefore(LocalDate date);

    long countByEventDateBefore(LocalDate date);

    /** Reservations matching {@code filter}, filtered by the database rather than in memory. */
    default List<Reservation> findMatching(ReservationFilter filter) {
        return findAll(filter.toSpecification());
    }
}
