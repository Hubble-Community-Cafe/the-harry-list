package com.pimvanleeuwen.the_harry_list_backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditAction;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditLog;
import com.pimvanleeuwen.the_harry_list_backend.repository.AuditLogRepository;
import com.pimvanleeuwen.the_harry_list_backend.util.AuditActorResolver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Central API for writing persistent audit entries. The actor is resolved
 * internally from the security context, so callers do not need to thread a
 * {@code Principal} through their signatures.
 *
 * <p>All writes are wrapped defensively: a failure to record an audit entry is
 * logged but never propagated, so it can never break the underlying business
 * operation (same philosophy as the existing email-send paths).
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /** Record a creation. {@code snapshot} may carry the initial field values, or be empty. */
    public void recordCreate(AuditEntityType entityType, Long entityId, String label,
                             List<FieldChange> snapshot, String summary) {
        record(entityType, entityId, label, AuditAction.CREATE, snapshot, summary);
    }

    /** Record an update. No-op when there are no field changes. */
    public void recordUpdate(AuditEntityType entityType, Long entityId, String label,
                             List<FieldChange> diffs, String summary) {
        if (diffs == null || diffs.isEmpty()) {
            return;
        }
        record(entityType, entityId, label, AuditAction.UPDATE, diffs, summary);
    }

    /** Record a deletion. */
    public void recordDelete(AuditEntityType entityType, Long entityId, String label, String summary) {
        record(entityType, entityId, label, AuditAction.DELETE, List.of(), summary);
    }

    /** Record an arbitrary action with optional field changes. */
    public void recordAction(AuditEntityType entityType, Long entityId, String label,
                             AuditAction action, List<FieldChange> changes, String summary) {
        record(entityType, entityId, label, action, changes, summary);
    }

    private void record(AuditEntityType entityType, Long entityId, String label,
                        AuditAction action, List<FieldChange> changes, String summary) {
        try {
            AuditActorResolver.Actor actor = AuditActorResolver.resolveCurrentActor();

            AuditLog entry = new AuditLog();
            entry.setEntityType(entityType);
            entry.setEntityId(entityId);
            entry.setEntityLabel(label);
            entry.setAction(action);
            entry.setActorOid(actor.oid());
            entry.setActorEmail(actor.email());
            entry.setActorName(actor.name());
            entry.setChanges(serialize(changes));
            entry.setSummary(summary);

            auditLogRepository.save(entry);
        } catch (Exception e) {
            // Auditing must never break the underlying operation.
            log.error("Failed to write audit log entry: entityType={} action={} entityId={}",
                    entityType, action, entityId, e);
        }
    }

    private String serialize(List<FieldChange> changes) {
        if (changes == null || changes.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(changes);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize audit field changes", e);
            return null;
        }
    }
}
