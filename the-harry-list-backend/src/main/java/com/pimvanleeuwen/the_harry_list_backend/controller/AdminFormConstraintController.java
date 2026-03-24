package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.model.FormConstraint;
import com.pimvanleeuwen.the_harry_list_backend.repository.FormConstraintRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/form-constraints")
@Tag(name = "Admin - Form Constraints", description = "Manage dynamic form constraints")
public class AdminFormConstraintController {

    private final FormConstraintRepository repository;

    public AdminFormConstraintController(FormConstraintRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    @Operation(summary = "List all form constraints")
    public ResponseEntity<List<FormConstraint>> listAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a form constraint by ID")
    public ResponseEntity<FormConstraint> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create a new form constraint")
    public ResponseEntity<FormConstraint> create(@RequestBody FormConstraint constraint) {
        FormConstraint saved = repository.save(constraint);
        return ResponseEntity.status(201).body(saved);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a form constraint")
    public ResponseEntity<FormConstraint> update(@PathVariable Long id, @RequestBody FormConstraint constraint) {
        return repository.findById(id)
                .map(existing -> {
                    existing.setConstraintType(constraint.getConstraintType());
                    existing.setTriggerActivity(constraint.getTriggerActivity());
                    existing.setTargetValue(constraint.getTargetValue());
                    existing.setNumericValue(constraint.getNumericValue());
                    existing.setSecondaryValue(constraint.getSecondaryValue());
                    existing.setMessage(constraint.getMessage());
                    existing.setEnabled(constraint.getEnabled());
                    return ResponseEntity.ok(repository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle")
    @Operation(summary = "Toggle a constraint's enabled state")
    public ResponseEntity<FormConstraint> toggle(@PathVariable Long id) {
        return repository.findById(id)
                .map(existing -> {
                    existing.setEnabled(!existing.getEnabled());
                    return ResponseEntity.ok(repository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a form constraint")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
