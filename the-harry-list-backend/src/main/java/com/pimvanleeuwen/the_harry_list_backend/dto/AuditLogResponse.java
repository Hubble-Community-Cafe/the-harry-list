package com.pimvanleeuwen.the_harry_list_backend.dto;

import com.pimvanleeuwen.the_harry_list_backend.model.AuditAction;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;

import java.time.LocalDateTime;
import java.util.List;

/**
 * API representation of an audit entry, with {@code changes} parsed from its
 * stored JSON form into a typed list.
 */
public record AuditLogResponse(
        Long id,
        AuditEntityType entityType,
        Long entityId,
        String entityLabel,
        AuditAction action,
        String actorOid,
        String actorEmail,
        String actorName,
        List<FieldChange> changes,
        String summary,
        LocalDateTime createdAt
) {
}
