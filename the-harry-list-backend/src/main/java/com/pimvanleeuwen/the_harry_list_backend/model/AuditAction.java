package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * The kind of change captured by an {@link AuditLog} entry.
 * Extensible: add new actions as more mutation points are audited.
 */
public enum AuditAction {
    CREATE,
    UPDATE,
    DELETE,
    STATUS_CHANGE,
    NOTES_UPDATED,
    CATERING_ARRANGED,
    EMAIL_SENT,
    ROLE_CHANGED,
    TOGGLE
}
