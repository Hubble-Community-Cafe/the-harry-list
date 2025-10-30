package com.pimvanleeuwen.the_harry_list_backend.repository;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

}
