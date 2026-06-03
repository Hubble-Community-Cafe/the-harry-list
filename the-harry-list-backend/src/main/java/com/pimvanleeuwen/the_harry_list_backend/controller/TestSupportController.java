package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.model.AdminRole;
import com.pimvanleeuwen.the_harry_list_backend.model.AdminUser;
import com.pimvanleeuwen.the_harry_list_backend.model.BlockedPeriod;
import com.pimvanleeuwen.the_harry_list_backend.repository.AdminUserRepository;
import com.pimvanleeuwen.the_harry_list_backend.repository.AuditLogRepository;
import com.pimvanleeuwen.the_harry_list_backend.repository.BlockedPeriodRepository;
import com.pimvanleeuwen.the_harry_list_backend.repository.CalendarAppointmentRepository;
import com.pimvanleeuwen.the_harry_list_backend.repository.FormConstraintRepository;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Test-only helper endpoints used by the end-to-end suite to seed and reset state
 * without going through Azure-authenticated admin APIs.
 *
 * <p>Gated to the {@code e2e} Spring profile — these endpoints never exist in dev or
 * production. {@link E2eSecurityConfig} permits {@code /test/**} only under that profile.</p>
 */
@RestController
@RequestMapping("/test")
@Profile("e2e")
@Tag(name = "E2E Test Support", description = "Seed/reset helpers — e2e profile only")
public class TestSupportController {

    private final ReservationRepository reservationRepository;
    private final BlockedPeriodRepository blockedPeriodRepository;
    private final FormConstraintRepository formConstraintRepository;
    private final CalendarAppointmentRepository calendarAppointmentRepository;
    private final AuditLogRepository auditLogRepository;
    private final AdminUserRepository adminUserRepository;

    public TestSupportController(ReservationRepository reservationRepository,
                                 BlockedPeriodRepository blockedPeriodRepository,
                                 FormConstraintRepository formConstraintRepository,
                                 CalendarAppointmentRepository calendarAppointmentRepository,
                                 AuditLogRepository auditLogRepository,
                                 AdminUserRepository adminUserRepository) {
        this.reservationRepository = reservationRepository;
        this.blockedPeriodRepository = blockedPeriodRepository;
        this.formConstraintRepository = formConstraintRepository;
        this.calendarAppointmentRepository = calendarAppointmentRepository;
        this.auditLogRepository = auditLogRepository;
        this.adminUserRepository = adminUserRepository;
    }

    /** Wipe the mutable state an e2e test cares about, for a clean run. */
    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> reset() {
        auditLogRepository.deleteAll();
        reservationRepository.deleteAll();
        blockedPeriodRepository.deleteAll();
        formConstraintRepository.deleteAll();
        calendarAppointmentRepository.deleteAll();
        adminUserRepository.deleteAll();
        return ResponseEntity.ok(Map.of("status", "reset"));
    }

    public record SeedUser(String oid, String email, String name, String role) {
    }

    /** Create or update an admin user with a specific role, so RBAC paths can be exercised. */
    @PostMapping("/users")
    public ResponseEntity<AdminUser> seedUser(@RequestBody SeedUser body) {
        AdminRole role = AdminRole.valueOf(body.role());
        AdminUser user = adminUserRepository.findByAzureOid(body.oid())
                .orElseGet(AdminUser::new);
        user.setAzureOid(body.oid());
        user.setEmail(body.email() != null ? body.email() : body.oid() + "@e2e.test");
        user.setDisplayName(body.name() != null ? body.name() : body.oid());
        user.setRole(role);
        return ResponseEntity.ok(adminUserRepository.save(user));
    }

    /** Seed a blocked period directly (bypasses auth) for public-form scenarios. */
    @PostMapping("/blocked-periods")
    public ResponseEntity<BlockedPeriod> seedBlockedPeriod(@RequestBody BlockedPeriod period) {
        return ResponseEntity.ok(blockedPeriodRepository.save(period));
    }
}
