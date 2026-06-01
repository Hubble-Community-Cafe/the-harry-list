package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * The type of entity an {@link AuditLog} entry refers to.
 */
public enum AuditEntityType {
    RESERVATION,
    BLOCKED_PERIOD,
    CALENDAR_APPOINTMENT,
    EMAIL_TEMPLATE,
    EMAIL_ATTACHMENT,
    FORM_CONSTRAINT,
    ADMIN_USER
}
