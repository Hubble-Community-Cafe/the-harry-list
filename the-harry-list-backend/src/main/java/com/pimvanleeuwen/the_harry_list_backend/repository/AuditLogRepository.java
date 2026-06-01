package com.pimvanleeuwen.the_harry_list_backend.repository;

import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {

    /** Entries for a single entity, newest first (used for the per-entity history timeline). */
    List<AuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(AuditEntityType entityType, Long entityId);
}
