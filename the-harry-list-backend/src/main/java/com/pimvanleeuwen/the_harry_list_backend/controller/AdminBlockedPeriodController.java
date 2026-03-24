package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.model.BlockedPeriod;
import com.pimvanleeuwen.the_harry_list_backend.repository.BlockedPeriodRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/blocked-periods")
@Tag(name = "Admin - Blocked Periods", description = "Manage blocked reservation periods")
public class AdminBlockedPeriodController {

    private final BlockedPeriodRepository repository;

    public AdminBlockedPeriodController(BlockedPeriodRepository repository) {
        this.repository = repository;
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
    @Operation(summary = "Create a new blocked period")
    public ResponseEntity<BlockedPeriod> create(@RequestBody BlockedPeriod period) {
        BlockedPeriod saved = repository.save(period);
        return ResponseEntity.status(201).body(saved);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a blocked period")
    public ResponseEntity<BlockedPeriod> update(@PathVariable Long id, @RequestBody BlockedPeriod period) {
        return repository.findById(id)
                .map(existing -> {
                    existing.setLocation(period.getLocation());
                    existing.setStartDate(period.getStartDate());
                    existing.setEndDate(period.getEndDate());
                    existing.setStartTime(period.getStartTime());
                    existing.setEndTime(period.getEndTime());
                    existing.setReason(period.getReason());
                    existing.setPublicMessage(period.getPublicMessage());
                    existing.setEnabled(period.getEnabled());
                    return ResponseEntity.ok(repository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle")
    @Operation(summary = "Toggle a blocked period's enabled state")
    public ResponseEntity<BlockedPeriod> toggle(@PathVariable Long id) {
        return repository.findById(id)
                .map(existing -> {
                    existing.setEnabled(!existing.getEnabled());
                    return ResponseEntity.ok(repository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a blocked period")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
