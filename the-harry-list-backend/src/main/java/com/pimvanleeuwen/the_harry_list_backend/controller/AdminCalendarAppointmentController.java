package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditAction;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.CalendarAppointment;
import com.pimvanleeuwen.the_harry_list_backend.repository.CalendarAppointmentRepository;
import com.pimvanleeuwen.the_harry_list_backend.service.AuditDiff;
import com.pimvanleeuwen.the_harry_list_backend.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/calendar-appointments")
@Tag(name = "Admin - Calendar Appointments", description = "Manage custom calendar appointments that appear in ICS feeds")
@SecurityRequirement(name = "basicAuth")
public class AdminCalendarAppointmentController {

    private final CalendarAppointmentRepository repository;
    private final AuditService auditService;

    public AdminCalendarAppointmentController(CalendarAppointmentRepository repository, AuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    private static String label(CalendarAppointment a) {
        return "Appointment: " + a.getTitle();
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
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Create a new calendar appointment")
    public ResponseEntity<CalendarAppointment> create(@RequestBody CalendarAppointment appointment) {
        CalendarAppointment saved = repository.save(appointment);
        auditService.recordCreate(AuditEntityType.CALENDAR_APPOINTMENT, saved.getId(), label(saved),
                List.of(), "Appointment created");
        return ResponseEntity.status(201).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Update a calendar appointment")
    public ResponseEntity<CalendarAppointment> update(@PathVariable Long id, @RequestBody CalendarAppointment appointment) {
        return repository.findById(id)
                .map(existing -> {
                    List<FieldChange> diffs = AuditDiff.compare(existing, appointment);
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
                    CalendarAppointment saved = repository.save(existing);
                    auditService.recordUpdate(AuditEntityType.CALENDAR_APPOINTMENT, saved.getId(), label(saved),
                            diffs, "Appointment updated");
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Toggle a calendar appointment's enabled state")
    public ResponseEntity<CalendarAppointment> toggle(@PathVariable Long id) {
        return repository.findById(id)
                .map(existing -> {
                    boolean previous = Boolean.TRUE.equals(existing.getEnabled());
                    existing.setEnabled(!existing.getEnabled());
                    CalendarAppointment saved = repository.save(existing);
                    auditService.recordAction(AuditEntityType.CALENDAR_APPOINTMENT, saved.getId(), label(saved),
                            AuditAction.TOGGLE,
                            List.of(new FieldChange("enabled", String.valueOf(previous), String.valueOf(saved.getEnabled()))),
                            "Appointment " + (saved.getEnabled() ? "enabled" : "disabled"));
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Delete a calendar appointment")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        return repository.findById(id)
                .map(existing -> {
                    repository.delete(existing);
                    auditService.recordDelete(AuditEntityType.CALENDAR_APPOINTMENT, id, label(existing),
                            "Appointment deleted");
                    return ResponseEntity.ok(Map.of("status", "deleted"));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
