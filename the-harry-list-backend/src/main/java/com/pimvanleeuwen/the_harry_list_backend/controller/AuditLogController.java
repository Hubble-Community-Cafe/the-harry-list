package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pimvanleeuwen.the_harry_list_backend.dto.AuditLogResponse;
import com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditAction;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditLog;
import com.pimvanleeuwen.the_harry_list_backend.repository.AuditLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Read-only API over the audit log.
 *
 * <ul>
 *   <li>The global, filterable log is ADMIN-only (it spans all entities and actors).</li>
 *   <li>The per-reservation history is available to any authenticated viewer.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/admin/audit")
@Tag(name = "Admin - Audit Log", description = "Read-only audit trail of changes (login required)")
@SecurityRequirement(name = "basicAuth")
public class AuditLogController {

    private static final Logger log = LoggerFactory.getLogger(AuditLogController.class);

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AuditLogController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List audit entries", description = "Paged, filterable audit trail across all entities (admin only)")
    public ResponseEntity<Map<String, Object>> getAuditLog(
            @RequestParam(required = false) AuditEntityType entityType,
            @RequestParam(required = false) Long entityId,
            @RequestParam(required = false) String actorEmail,
            @RequestParam(required = false) AuditAction action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (entityType != null) predicates.add(cb.equal(root.get("entityType"), entityType));
            if (entityId != null) predicates.add(cb.equal(root.get("entityId"), entityId));
            if (action != null) predicates.add(cb.equal(root.get("action"), action));
            if (actorEmail != null && !actorEmail.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("actorEmail")), "%" + actorEmail.toLowerCase() + "%"));
            }
            if (from != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null) predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<AuditLog> result = auditLogRepository.findAll(spec,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        List<AuditLogResponse> content = result.getContent().stream().map(this::toResponse).toList();

        Map<String, Object> body = Map.of(
                "content", content,
                "page", result.getNumber(),
                "size", result.getSize(),
                "totalElements", result.getTotalElements(),
                "totalPages", result.getTotalPages()
        );
        return ResponseEntity.ok(body);
    }

    @GetMapping("/reservation/{id}")
    @PreAuthorize("hasRole('VIEWER')")
    @Operation(summary = "Reservation history", description = "Audit entries for a single reservation, newest first")
    public ResponseEntity<List<AuditLogResponse>> getReservationHistory(@PathVariable Long id) {
        List<AuditLogResponse> entries = auditLogRepository
                .findByEntityTypeAndEntityIdOrderByCreatedAtDesc(AuditEntityType.RESERVATION, id)
                .stream().map(this::toResponse).toList();
        return ResponseEntity.ok(entries);
    }

    private AuditLogResponse toResponse(AuditLog entry) {
        return new AuditLogResponse(
                entry.getId(), entry.getEntityType(), entry.getEntityId(), entry.getEntityLabel(),
                entry.getAction(), entry.getActorOid(), entry.getActorEmail(), entry.getActorName(),
                parseChanges(entry.getChanges()), entry.getSummary(), entry.getCreatedAt());
    }

    private List<FieldChange> parseChanges(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<FieldChange>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse audit changes JSON: {}", json, e);
            return List.of();
        }
    }
}
