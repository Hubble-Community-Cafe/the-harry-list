package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange;
import com.pimvanleeuwen.the_harry_list_backend.model.AdminRole;
import com.pimvanleeuwen.the_harry_list_backend.model.AdminUser;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditAction;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.repository.AdminUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
public class AdminUserService {

    private static final Logger log = LoggerFactory.getLogger(AdminUserService.class);

    private final AdminUserRepository adminUserRepository;
    private final AuditService auditService;
    private final String initialAdminOid;

    public AdminUserService(
            AdminUserRepository adminUserRepository,
            AuditService auditService,
            @Value("${app.initial-admin-oid:}") String initialAdminOid) {
        this.adminUserRepository = adminUserRepository;
        this.auditService = auditService;
        this.initialAdminOid = initialAdminOid;
    }

    /**
     * Find existing user by Azure OID or create a new one.
     * New users get VIEWER role, except if their OID matches INITIAL_ADMIN_OID.
     */
    public AdminUser getOrCreateUser(String azureOid, String email, String displayName) {
        return adminUserRepository.findByAzureOid(azureOid)
                .map(existing -> {
                    updateIfChanged(existing, email, displayName);
                    return existing;
                })
                .orElseGet(() -> createUser(azureOid, email, displayName));
    }

    public AdminUser getCurrentUser(String azureOid) {
        return adminUserRepository.findByAzureOid(azureOid).orElse(null);
    }

    public List<AdminUser> getAllUsers() {
        return adminUserRepository.findAll();
    }

    /**
     * Update a user's role. Prevents an admin from demoting themselves.
     */
    public AdminUser updateRole(Long userId, AdminRole newRole, String requestingUserOid) {
        AdminUser target = adminUserRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (target.getAzureOid().equals(requestingUserOid)) {
            throw new IllegalArgumentException("Cannot change your own role");
        }

        AdminRole oldRole = target.getRole();
        log.info("AUDIT user.role_changed userId={} oldRole={} newRole={} changedBy='{}'",
                userId, oldRole, newRole, requestingUserOid);

        target.setRole(newRole);
        AdminUser saved = adminUserRepository.save(target);

        auditService.recordAction(AuditEntityType.ADMIN_USER, userId, saved.getEmail(),
                AuditAction.ROLE_CHANGED,
                List.of(new FieldChange("role", String.valueOf(oldRole), String.valueOf(newRole))),
                "Role changed for " + saved.getEmail());

        return saved;
    }

    private AdminUser createUser(String azureOid, String email, String displayName) {
        AdminUser user = new AdminUser();
        user.setAzureOid(azureOid);
        user.setEmail(email);
        user.setDisplayName(displayName);

        if (initialAdminOid != null && !initialAdminOid.isBlank() && initialAdminOid.equals(azureOid)) {
            user.setRole(AdminRole.ADMIN);
            log.info("AUDIT user.created email='{}' role=ADMIN (initial admin)", email);
        } else {
            user.setRole(AdminRole.VIEWER);
            log.info("AUDIT user.created email='{}' role=VIEWER", email);
        }

        return adminUserRepository.save(user);
    }

    /**
     * Mirror the token's email and display name onto the stored row when they have drifted.
     *
     * <p>Best effort on purpose. This runs in the role filter on every staff request, and the admin
     * fires several requests at once, so when a name changes in Entra they all try to write the same
     * new values together. MariaDB 11.6+ defaults {@code innodb_snapshot_isolation} to ON, which turns
     * that concurrent read-then-write into error 1020 ("Record has changed since last read") instead
     * of serialising it, and the losers used to fail their whole request with a 500. Losing the race
     * is harmless: the winner has already stored identical values.
     */
    private void updateIfChanged(AdminUser user, String email, String displayName) {
        String newEmail = email != null ? email : user.getEmail();
        String newDisplayName = displayName != null ? displayName : user.getDisplayName();

        boolean changed = !Objects.equals(newEmail, user.getEmail())
                || !Objects.equals(newDisplayName, user.getDisplayName());
        if (!changed) {
            return;
        }

        try {
            adminUserRepository.updateIdentity(user.getId(), newEmail, newDisplayName, LocalDateTime.now());
            user.setEmail(newEmail);
            user.setDisplayName(newDisplayName);
        } catch (DataAccessException e) {
            log.debug("Skipped identity refresh for oid={}, lost a concurrent write", user.getAzureOid(), e);
        }
    }
}
