package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.config.SecurityConfig;
import com.pimvanleeuwen.the_harry_list_backend.service.DataRetentionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminSettingsController.class)
@Import(SecurityConfig.class)
class AdminSettingsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DataRetentionService dataRetentionService;

    @Test
    @WithMockUser
    void getRetentionSettings_shouldReturnEnabledWhenRetentionPositive() throws Exception {
        when(dataRetentionService.getRetentionDays()).thenReturn(365);
        when(dataRetentionService.isEnabled()).thenReturn(true);
        when(dataRetentionService.countEligibleForDeletion()).thenReturn(3L);

        mockMvc.perform(get("/api/admin/settings/retention"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.retentionDays").value(365))
            .andExpect(jsonPath("$.enabled").value(true))
            .andExpect(jsonPath("$.eligibleForDeletion").value(3))
            .andExpect(jsonPath("$.nextRunAt").exists())
            .andExpect(jsonPath("$.cutoffDate").exists());
    }

    @Test
    @WithMockUser
    void getRetentionSettings_shouldReturnDisabledWhenRetentionZero() throws Exception {
        when(dataRetentionService.getRetentionDays()).thenReturn(0);
        when(dataRetentionService.isEnabled()).thenReturn(false);
        when(dataRetentionService.countEligibleForDeletion()).thenReturn(0L);

        mockMvc.perform(get("/api/admin/settings/retention"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.retentionDays").value(0))
            .andExpect(jsonPath("$.enabled").value(false))
            .andExpect(jsonPath("$.eligibleForDeletion").value(0));
    }

    @Test
    @WithMockUser
    void getRetentionSettings_shouldReturn180DaysWhenConfigured() throws Exception {
        when(dataRetentionService.getRetentionDays()).thenReturn(180);
        when(dataRetentionService.isEnabled()).thenReturn(true);
        when(dataRetentionService.countEligibleForDeletion()).thenReturn(0L);

        mockMvc.perform(get("/api/admin/settings/retention"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.retentionDays").value(180))
            .andExpect(jsonPath("$.enabled").value(true));
    }

    @Test
    void getRetentionSettings_shouldRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/settings/retention"))
            .andExpect(status().isUnauthorized());
    }
}
