package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.config.SecurityConfig;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailAttachment;
import com.pimvanleeuwen.the_harry_list_backend.repository.EmailAttachmentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminEmailAttachmentController.class)
@Import(SecurityConfig.class)
class AdminEmailAttachmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EmailAttachmentRepository repository;

    private EmailAttachment sampleAttachment() {
        return EmailAttachment.builder()
                .id(1L)
                .name("Catering Menu")
                .filename("menu.pdf")
                .contentType("application/pdf")
                .data(new byte[]{1, 2, 3})
                .active(true)
                .build();
    }

    @Test
    @WithMockUser
    void listAttachments_shouldReturnAllAttachments() throws Exception {
        when(repository.findAll()).thenReturn(List.of(sampleAttachment()));

        mockMvc.perform(get("/api/admin/email-attachments"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name").value("Catering Menu"))
            .andExpect(jsonPath("$[0].filename").value("menu.pdf"))
            .andExpect(jsonPath("$[0].active").value(true));
    }

    @Test
    @WithMockUser
    void listAttachments_shouldReturnEmptyList() throws Exception {
        when(repository.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/email-attachments"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void uploadAttachment_shouldAcceptPdf() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "menu.pdf", "application/pdf", new byte[]{1, 2, 3});

        when(repository.save(any())).thenReturn(sampleAttachment());

        mockMvc.perform(multipart("/api/admin/email-attachments")
                .file(file)
                .param("name", "Catering Menu")
                .with(csrf()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Catering Menu"));

        verify(repository).save(any());
    }

    @Test
    @WithMockUser
    void uploadAttachment_shouldRejectNonPdf() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "doc.txt", "text/plain", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/admin/email-attachments")
                .file(file)
                .param("name", "Not a PDF")
                .with(csrf()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Only PDF files are allowed"));

        verify(repository, never()).save(any());
    }

    @Test
    @WithMockUser
    void uploadAttachment_shouldRejectEmptyFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "empty.pdf", "application/pdf", new byte[0]);

        mockMvc.perform(multipart("/api/admin/email-attachments")
                .file(file)
                .param("name", "Empty")
                .with(csrf()))
            .andExpect(status().isBadRequest());

        verify(repository, never()).save(any());
    }

    @Test
    @WithMockUser
    void uploadAttachment_shouldRejectOversizedFile() throws Exception {
        byte[] bigData = new byte[4 * 1024 * 1024]; // 4MB, exceeds 3MB limit
        MockMultipartFile file = new MockMultipartFile(
                "file", "big.pdf", "application/pdf", bigData);

        mockMvc.perform(multipart("/api/admin/email-attachments")
                .file(file)
                .param("name", "Big PDF")
                .with(csrf()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("File size exceeds 3MB limit"));

        verify(repository, never()).save(any());
    }

    @Test
    @WithMockUser
    void deleteAttachment_shouldDeleteExisting() throws Exception {
        when(repository.existsById(1L)).thenReturn(true);

        mockMvc.perform(delete("/api/admin/email-attachments/1").with(csrf()))
            .andExpect(status().isOk());

        verify(repository).deleteById(1L);
    }

    @Test
    @WithMockUser
    void deleteAttachment_shouldReturn404WhenNotFound() throws Exception {
        when(repository.existsById(999L)).thenReturn(false);

        mockMvc.perform(delete("/api/admin/email-attachments/999").with(csrf()))
            .andExpect(status().isNotFound());

        verify(repository, never()).deleteById(any());
    }

    @Test
    @WithMockUser
    void toggleActive_shouldToggleToInactive() throws Exception {
        EmailAttachment attachment = sampleAttachment();
        when(repository.findById(1L)).thenReturn(Optional.of(attachment));
        when(repository.save(any())).thenReturn(EmailAttachment.builder()
                .id(1L).name("Catering Menu").filename("menu.pdf")
                .contentType("application/pdf").data(new byte[]{1, 2, 3})
                .active(false).build());

        mockMvc.perform(patch("/api/admin/email-attachments/1/active")
                .param("active", "false")
                .with(csrf()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.active").value(false));

        verify(repository).save(argThat(a -> !a.isActive()));
    }

    @Test
    @WithMockUser
    void toggleActive_shouldReturn404WhenNotFound() throws Exception {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/api/admin/email-attachments/999/active")
                .param("active", "true")
                .with(csrf()))
            .andExpect(status().isNotFound());
    }

    @Test
    void endpoints_shouldRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/email-attachments"))
            .andExpect(status().isUnauthorized());
    }
}
