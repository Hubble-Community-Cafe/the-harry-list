package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pimvanleeuwen.the_harry_list_backend.config.SecurityConfig;
import com.pimvanleeuwen.the_harry_list_backend.dto.EmailTemplateDto;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailTemplateType;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailNotificationService;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailTemplateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminEmailTemplateController.class)
@Import(SecurityConfig.class)
class AdminEmailTemplateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EmailTemplateService emailTemplateService;

    @MockitoBean
    private EmailNotificationService emailNotificationService;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
    }

    private EmailTemplateDto sampleDto(EmailTemplateType type, boolean customized) {
        return EmailTemplateDto.builder()
                .templateType(type)
                .displayName(type.getDisplayName())
                .description(type.getDescription())
                .subject("Subject for " + type.name())
                .bodyTemplate("<p>Body for " + type.name() + "</p>")
                .customized(customized)
                .availableVariables(List.of("contactName", "eventTitle"))
                .build();
    }

    @Test
    @WithMockUser
    void listAll_shouldReturnAllTemplates() throws Exception {
        List<EmailTemplateDto> templates = List.of(
                sampleDto(EmailTemplateType.SUBMITTED, false),
                sampleDto(EmailTemplateType.STATUS_CHANGED, true),
                sampleDto(EmailTemplateType.UPDATED, false),
                sampleDto(EmailTemplateType.CANCELLED, false),
                sampleDto(EmailTemplateType.STAFF_NOTIFICATION, false));
        when(emailTemplateService.findAll()).thenReturn(templates);

        mockMvc.perform(get("/api/admin/email-templates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$[0].templateType").value("SUBMITTED"))
                .andExpect(jsonPath("$[1].customized").value(true));
    }

    @Test
    void listAll_shouldRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/email-templates"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void getByType_shouldReturnTemplate() throws Exception {
        EmailTemplateDto dto = sampleDto(EmailTemplateType.CANCELLED, false);
        when(emailTemplateService.findByType(EmailTemplateType.CANCELLED)).thenReturn(Optional.of(dto));

        mockMvc.perform(get("/api/admin/email-templates/CANCELLED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.templateType").value("CANCELLED"))
                .andExpect(jsonPath("$.displayName").value("Reservation Cancelled"))
                .andExpect(jsonPath("$.customized").value(false))
                .andExpect(jsonPath("$.availableVariables").isArray());
    }

    @Test
    @WithMockUser
    void getByType_shouldReturn404ForUnknownType() throws Exception {
        mockMvc.perform(get("/api/admin/email-templates/NONEXISTENT"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void update_shouldSaveAndReturnTemplate() throws Exception {
        EmailTemplateDto updated = sampleDto(EmailTemplateType.SUBMITTED, true);
        when(emailTemplateService.update(eq(EmailTemplateType.SUBMITTED), any(), any())).thenReturn(updated);

        Map<String, String> request = Map.of(
                "subject", "Custom subject {{eventTitle}}",
                "bodyTemplate", "<p>Hello {{contactName}}</p>");

        mockMvc.perform(put("/api/admin/email-templates/SUBMITTED")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.templateType").value("SUBMITTED"))
                .andExpect(jsonPath("$.customized").value(true));

        verify(emailTemplateService).update(eq(EmailTemplateType.SUBMITTED),
                eq("Custom subject {{eventTitle}}"),
                eq("<p>Hello {{contactName}}</p>"));
    }

    @Test
    @WithMockUser
    void update_shouldRejectBlankSubject() throws Exception {
        Map<String, String> request = Map.of(
                "subject", "",
                "bodyTemplate", "<p>body</p>");

        mockMvc.perform(put("/api/admin/email-templates/SUBMITTED")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void update_shouldRejectBlankBody() throws Exception {
        Map<String, String> request = Map.of(
                "subject", "Valid subject",
                "bodyTemplate", "");

        mockMvc.perform(put("/api/admin/email-templates/SUBMITTED")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void reset_shouldReturn204() throws Exception {
        doNothing().when(emailTemplateService).reset(EmailTemplateType.UPDATED);

        mockMvc.perform(delete("/api/admin/email-templates/UPDATED").with(csrf()))
                .andExpect(status().isNoContent());

        verify(emailTemplateService).reset(EmailTemplateType.UPDATED);
    }

    @Test
    void reset_shouldRequireAuthentication() throws Exception {
        mockMvc.perform(delete("/api/admin/email-templates/UPDATED").with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void sendTestEmail_shouldSendAndReturnSentStatus() throws Exception {
        when(emailTemplateService.buildSampleVariables(EmailTemplateType.SUBMITTED)).thenReturn(Map.of("eventTitle", "Test"));
        when(emailTemplateService.renderForTest(any(), any())).thenReturn("Rendered subject", "Rendered body");
        doNothing().when(emailNotificationService).sendRawEmail(any(), any(), any());

        Map<String, String> request = Map.of(
                "toEmail", "test@example.com",
                "subject", "Test subject {{eventTitle}}",
                "bodyTemplate", "<p>Hello</p>");

        mockMvc.perform(post("/api/admin/email-templates/SUBMITTED/test")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("sent"));

        verify(emailNotificationService).sendRawEmail(eq("test@example.com"), any(), any());
    }

    @Test
    @WithMockUser
    void sendTestEmail_shouldRejectInvalidEmail() throws Exception {
        Map<String, String> request = Map.of("toEmail", "not-an-email");

        mockMvc.perform(post("/api/admin/email-templates/SUBMITTED/test")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void sendTestEmail_shouldRejectMissingEmail() throws Exception {
        mockMvc.perform(post("/api/admin/email-templates/SUBMITTED/test")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }
}
