package com.pimvanleeuwen.the_harry_list_backend.repository;

import com.pimvanleeuwen.the_harry_list_backend.model.CalendarAppointment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CalendarAppointmentRepository extends JpaRepository<CalendarAppointment, Long> {
    List<CalendarAppointment> findByEnabledTrue();
}