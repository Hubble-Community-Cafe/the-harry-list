package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditAction;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.BlockedPeriod;
import com.pimvanleeuwen.the_harry_list_backend.repository.BlockedPeriodRepository;
import com.pimvanleeuwen.the_harry_list_backend.service.AuditDiff;
import com.pimvanleeuwen.the_harry_list_backend.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/blocked-periods")
@Tag(name = "Admin - Blocked Periods", description = "Manage blocked reservation periods")
public class AdminBlockedPeriodController {

    private final BlockedPeriodRepository repository;
    private final AuditService auditService;

    public AdminBlockedPeriodController(BlockedPeriodRepository repository, AuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    private static String label(BlockedPeriod p) {
        return "Blocked period: " + p.getReason();
    }

    @GetMapping
    @Operation(summary = "List all blocked periods")
    public ResponseEntity<List<BlockedPeriod>> listAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a blocked period by ID")
    public ResponseEntity<BlockedPeriod> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Create a new blocked period")
    public ResponseEntity<BlockedPeriod> create(@RequestBody BlockedPeriod period) {
        BlockedPeriod saved = repository.save(period);
        auditService.recordCreate(AuditEntityType.BLOCKED_PERIOD, saved.getId(), label(saved),
                List.of(), "Blocked period created");
        return ResponseEntity.status(201).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Update a blocked period")
    public ResponseEntity<BlockedPeriod> update(@PathVariable Long id, @RequestBody BlockedPeriod period) {
        return repository.findById(id)
                .map(existing -> {
                    // Diff incoming vs current before mutating the managed instance.
                    List<FieldChange> diffs = AuditDiff.compare(existing, period);
                    existing.setLocation(period.getLocation());
                    existing.setStartDate(period.getStartDate());
                    existing.setEndDate(period.getEndDate());
                    existing.setStartTime(period.getStartTime());
                    existing.setEndTime(period.getEndTime());
                    existing.setReason(period.getReason());
                    existing.setPublicMessage(period.getPublicMessage());
                    existing.setEnabled(period.getEnabled());
                    BlockedPeriod saved = repository.save(existing);
                    auditService.recordUpdate(AuditEntityType.BLOCKED_PERIOD, saved.getId(), label(saved),
                            diffs, "Blocked period updated");
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Toggle a blocked period's enabled state")
    public ResponseEntity<BlockedPeriod> toggle(@PathVariable Long id) {
        return repository.findById(id)
                .map(existing -> {
                    boolean previous = Boolean.TRUE.equals(existing.getEnabled());
                    existing.setEnabled(!existing.getEnabled());
                    BlockedPeriod saved = repository.save(existing);
                    auditService.recordAction(AuditEntityType.BLOCKED_PERIOD, saved.getId(), label(saved),
                            AuditAction.TOGGLE,
                            List.of(new FieldChange("enabled", String.valueOf(previous), String.valueOf(saved.getEnabled()))),
                            "Blocked period " + (saved.getEnabled() ? "enabled" : "disabled"));
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Delete a blocked period")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        return repository.findById(id)
                .map(existing -> {
                    repository.delete(existing);
                    auditService.recordDelete(AuditEntityType.BLOCKED_PERIOD, id, label(existing),
                            "Blocked period deleted");
                    return ResponseEntity.ok(Map.of("status", "deleted"));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
