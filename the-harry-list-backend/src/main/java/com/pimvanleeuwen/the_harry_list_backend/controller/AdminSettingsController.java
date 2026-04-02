package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.service.DataRetentionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;

/**
 * Read-only endpoint exposing system configuration to the admin panel.
 * Settings are configured via environment variables and cannot be changed via the API.
 */
@RestController
@RequestMapping("/api/admin/settings")
@Tag(name = "Admin - Settings", description = "Read-only system settings (configured via environment variables)")
@SecurityRequirement(name = "basicAuth")
public class AdminSettingsController {

    private final DataRetentionService dataRetentionService;

    public AdminSettingsController(DataRetentionService dataRetentionService) {
        this.dataRetentionService = dataRetentionService;
    }

    @GetMapping("/retention")
    @Operation(summary = "Get data retention settings", description = "Returns current data retention configuration (read-only, set via DATA_RETENTION_DAYS env var)")
    public ResponseEntity<Map<String, Object>> getRetentionSettings() {
        LocalDateTime nextRun = LocalDate.now().plusDays(1).atTime(LocalTime.of(2, 0));

        return ResponseEntity.ok(Map.of(
                "retentionDays", dataRetentionService.getRetentionDays(),
                "enabled", dataRetentionService.isEnabled(),
                "eligibleForDeletion", dataRetentionService.countEligibleForDeletion(),
                "nextRunAt", nextRun.toString(),
                "cutoffDate", dataRetentionService.isEnabled()
                        ? LocalDate.now().minusDays(dataRetentionService.getRetentionDays()).toString()
                        : null
        ));
    }
}
