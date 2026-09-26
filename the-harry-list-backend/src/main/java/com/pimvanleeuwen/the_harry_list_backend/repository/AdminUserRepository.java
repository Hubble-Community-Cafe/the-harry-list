package com.pimvanleeuwen.the_harry_list_backend.repository;

import com.pimvanleeuwen.the_harry_list_backend.model.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {

    Optional<AdminUser> findByAzureOid(String azureOid);

    /**
     * Refresh the identity fields mirrored from the Entra token, as a single statement in its own
     * transaction.
     *
     * <p>Deliberately not a managed-entity {@code save()}. This runs in the role filter on every
     * staff request, so concurrent requests race on the same row. A failed flush of a managed
     * entity would stay dirty in the open-in-view persistence context and fail again on the next
     * transaction of the same request; a bulk update cannot poison the request that way.
     *
     * <p>{@code clearAutomatically} so a later read in the same request sees the new values instead
     * of the stale first-level cache entry. {@code updatedAt} is passed in because
     * {@code @PreUpdate} does not fire for bulk updates.
     */
    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("UPDATE AdminUser u SET u.email = :email, u.displayName = :displayName, u.updatedAt = :now "
            + "WHERE u.id = :id")
    int updateIdentity(@Param("id") Long id,
                       @Param("email") String email,
                       @Param("displayName") String displayName,
                       @Param("now") LocalDateTime now);
}
