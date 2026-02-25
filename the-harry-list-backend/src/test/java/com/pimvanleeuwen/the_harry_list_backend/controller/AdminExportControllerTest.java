package com.pimvanleeuwen.the_harry_list_backend.controller;

import org.openpdf.text.DocumentException;
import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.service.PdfExportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for AdminExportController.
 */
@WebMvcTest(AdminExportController.class)
class AdminExportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PdfExportService pdfExportService;

    @Test
    @WithMockUser
    void generateDailyReport_shouldReturnPdf() throws Exception {
        // Given
        byte[] mockPdf = "%PDF-1.4 mock pdf content".getBytes();
        when(pdfExportService.generateDailyReport(any(LocalDate.class), eq(BarLocation.HUBBLE), anyBoolean()))
            .thenReturn(mockPdf);

        // When/Then
        mockMvc.perform(get("/api/admin/export/daily-report")
                .param("date", "2026-02-15")
                .param("location", "HUBBLE"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_PDF));
    }

    @Test
    @WithMockUser
    void generateDailyReport_shouldAcceptConfirmedOnlyParameter() throws Exception {
        // Given
        byte[] mockPdf = "%PDF-1.4 mock pdf content".getBytes();
        when(pdfExportService.generateDailyReport(any(LocalDate.class), eq(BarLocation.HUBBLE), eq(false)))
            .thenReturn(mockPdf);

        // When/Then
        mockMvc.perform(get("/api/admin/export/daily-report")
                .param("date", "2026-02-15")
                .param("location", "HUBBLE")
                .param("confirmedOnly", "false"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void generateDailyReport_shouldReturnBadRequestForInvalidDate() throws Exception {
        // When/Then
        mockMvc.perform(get("/api/admin/export/daily-report")
                .param("date", "invalid-date")
                .param("location", "HUBBLE"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void generateDailyReport_shouldReturnBadRequestForInvalidLocation() throws Exception {
        // When/Then
        mockMvc.perform(get("/api/admin/export/daily-report")
                .param("date", "2026-02-15")
                .param("location", "INVALID_LOCATION"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void generateDailyReport_shouldAcceptMeteorLocation() throws Exception {
        // Given
        byte[] mockPdf = "%PDF-1.4 mock pdf content".getBytes();
        when(pdfExportService.generateDailyReport(any(LocalDate.class), eq(BarLocation.METEOR), anyBoolean()))
            .thenReturn(mockPdf);

        // When/Then
        mockMvc.perform(get("/api/admin/export/daily-report")
                .param("date", "2026-02-15")
                .param("location", "METEOR"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_PDF));
    }

    @Test
    @WithMockUser
    void generateDailyReport_shouldAcceptLowercaseLocation() throws Exception {
        // Given
        byte[] mockPdf = "%PDF-1.4 mock pdf content".getBytes();
        when(pdfExportService.generateDailyReport(any(LocalDate.class), eq(BarLocation.HUBBLE), anyBoolean()))
            .thenReturn(mockPdf);

        // When/Then
        mockMvc.perform(get("/api/admin/export/daily-report")
                .param("date", "2026-02-15")
                .param("location", "hubble"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void generateDailyReport_shouldReturnInternalServerErrorOnException() throws Exception {
        // Given
        when(pdfExportService.generateDailyReport(any(LocalDate.class), any(BarLocation.class), anyBoolean()))
            .thenThrow(new DocumentException("PDF generation failed"));

        // When/Then
        mockMvc.perform(get("/api/admin/export/daily-report")
                .param("date", "2026-02-15")
                .param("location", "HUBBLE"))
            .andExpect(status().isInternalServerError());
    }

    @Test
    void generateDailyReport_shouldRequireAuthentication() throws Exception {
        // When/Then - no @WithMockUser, so should be unauthorized
        mockMvc.perform(get("/api/admin/export/daily-report")
                .param("date", "2026-02-15")
                .param("location", "HUBBLE"))
            .andExpect(status().isUnauthorized());
    }
}

