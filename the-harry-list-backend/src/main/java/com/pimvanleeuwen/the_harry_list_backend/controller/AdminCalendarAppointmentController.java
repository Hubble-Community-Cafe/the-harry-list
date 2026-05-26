package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.model.CalendarAppointment;
import com.pimvanleeuwen.the_harry_list_backend.repository.CalendarAppointmentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/calendar-appointments")
@Tag(name = "Admin - Calendar Appointments", description = "Manage custom calendar appointments that appear in ICS feeds")
@SecurityRequirement(name = "basicAuth")
public class AdminCalendarAppointmentController {

    private final CalendarAppointmentRepository repository;

    public AdminCalendarAppointmentController(CalendarAppointmentRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    @Operation(summary = "List all calendar appointments")
    public ResponseEntity<List<CalendarAppointment>> listAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a calendar appointment by ID")
    public ResponseEntity<CalendarAppointment> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create a new calendar appointment")
    public ResponseEntity<CalendarAppointment> create(@RequestBody CalendarAppointment appointment) {
        CalendarAppointment saved = repository.save(appointment);
        return ResponseEntity.status(201).body(saved);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a calendar appointment")
    public ResponseEntity<CalendarAppointment> update(@PathVariable Long id, @RequestBody CalendarAppointment appointment) {
        return repository.findById(id)
                .map(existing -> {
                    existing.setTitle(appointment.getTitle());
                    existing.setDescription(appointment.getDescription());
                    existing.setDate(appointment.getDate());
                    existing.setAllDay(appointment.getAllDay());
                    existing.setStartTime(appointment.getStartTime());
                    existing.setEndTime(appointment.getEndTime());
                    existing.setLocation(appointment.getLocation());
                    existing.setRecurrenceType(appointment.getRecurrenceType());
                    existing.setRecurrenceEndDate(appointment.getRecurrenceEndDate());
                    existing.setEnabled(appointment.getEnabled());
                    return ResponseEntity.ok(repository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle")
    @Operation(summary = "Toggle a calendar appointment's enabled state")
    public ResponseEntity<CalendarAppointment> toggle(@PathVariable Long id) {
        return repository.findById(id)
                .map(existing -> {
                    existing.setEnabled(!existing.getEnabled());
                    return ResponseEntity.ok(repository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a calendar appointment")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
