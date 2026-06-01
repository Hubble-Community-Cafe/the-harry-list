package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.config.SecurityConfig;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditAction;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditLog;
import com.pimvanleeuwen.the_harry_list_backend.repository.AuditLogRepository;
import com.pimvanleeuwen.the_harry_list_backend.service.AdminUserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuditLogController.class)
@Import(SecurityConfig.class)
class AuditLogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuditLogRepository auditLogRepository;

    // Required by RoleAuthorizationFilter pulled in via SecurityConfig.
    @MockitoBean
    private AdminUserService adminUserService;

    private AuditLog sampleEntry() {
        AuditLog entry = new AuditLog();
        entry.setId(10L);
        entry.setEntityType(AuditEntityType.RESERVATION);
        entry.setEntityId(1L);
        entry.setEntityLabel("ABC123 - Test Event");
        entry.setAction(AuditAction.STATUS_CHANGE);
        entry.setActorEmail("staff@example.com");
        entry.setActorName("Staff Member");
        entry.setChanges("[{\"field\":\"status\",\"oldValue\":\"PENDING\",\"newValue\":\"CONFIRMED\"}]");
        entry.setSummary("Status changed");
        entry.setCreatedAt(LocalDateTime.of(2026, 6, 1, 12, 0));
        return entry;
    }

    @Test
    void getAuditLog_shouldRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/audit"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void getAuditLog_shouldBeForbiddenForEditor() throws Exception {
        mockMvc.perform(get("/api/admin/audit"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    void getAuditLog_shouldBeForbiddenForViewer() throws Exception {
        mockMvc.perform(get("/api/admin/audit"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getAuditLog_shouldReturnPagedEntriesForAdmin() throws Exception {
        Page<AuditLog> page = new PageImpl<>(List.of(sampleEntry()));
        when(auditLogRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/admin/audit"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].action").value("STATUS_CHANGE"))
                .andExpect(jsonPath("$.content[0].entityLabel").value("ABC123 - Test Event"))
                .andExpect(jsonPath("$.content[0].changes[0].field").value("status"))
                .andExpect(jsonPath("$.content[0].changes[0].newValue").value("CONFIRMED"));
    }

    @Test
    void getReservationHistory_shouldRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/audit/reservation/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    void getReservationHistory_shouldBeAllowedForViewer() throws Exception {
        when(auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(AuditEntityType.RESERVATION, 1L))
                .thenReturn(List.of(sampleEntry()));

        mockMvc.perform(get("/api/admin/audit/reservation/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].changes[0].field").value("status"));
    }
}
