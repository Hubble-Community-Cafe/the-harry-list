package com.pimvanleeuwen.the_harry_list_backend.repository;

import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {

    /** Entries for a single entity, newest first (used for the per-entity history timeline). */
    List<AuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(AuditEntityType entityType, Long entityId);

    /** Data retention: remove the history of reservations that are being purged. */
    @Modifying
    @Query("delete from AuditLog a where a.entityType = :type and a.entityId in :ids")
    int deleteHistoryOf(@Param("type") AuditEntityType type, @Param("ids") Collection<Long> ids);

    /**
     * Data retention: remove entries older than {@code cutoff}, except the history of
     * reservations that still exist (that history goes when its reservation is purged).
     */
    @Modifying
    @Query("""
            delete from AuditLog a
            where a.createdAt < :cutoff
              and (a.entityType <> :reservation
                   or a.entityId is null
                   or a.entityId not in (select r.id from Reservation r))
            """)
    int deleteOlderThanExceptLiveReservations(@Param("cutoff") LocalDateTime cutoff,
                                              @Param("reservation") AuditEntityType reservation);
}
