package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pimvanleeuwen.the_harry_list_backend.config.SecurityConfig;
import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.BlockedPeriod;
import com.pimvanleeuwen.the_harry_list_backend.repository.BlockedPeriodRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminBlockedPeriodController.class)
@Import(SecurityConfig.class)
class AdminBlockedPeriodControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BlockedPeriodRepository repository;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    private BlockedPeriod samplePeriod() {
        return BlockedPeriod.builder()
                .id(1L)
                .location(BarLocation.HUBBLE)
                .startDate(LocalDate.of(2026, 4, 1))
                .endDate(LocalDate.of(2026, 4, 3))
                .reason("Spring maintenance")
                .publicMessage("Closed for maintenance from April 1-3")
                .enabled(true)
                .build();
    }

    @Test
    @WithMockUser
    void listAll_shouldReturnAllPeriods() throws Exception {
        when(repository.findAll()).thenReturn(List.of(samplePeriod()));

        mockMvc.perform(get("/api/admin/blocked-periods"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].reason").value("Spring maintenance"));
    }

    @Test
    void listAll_shouldRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/blocked-periods"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void getById_shouldReturnPeriod() throws Exception {
        when(repository.findById(1L)).thenReturn(Optional.of(samplePeriod()));

        mockMvc.perform(get("/api/admin/blocked-periods/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.location").value("HUBBLE"));
    }

    @Test
    @WithMockUser
    void getById_shouldReturn404ForMissing() throws Exception {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/admin/blocked-periods/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void create_shouldReturn201() throws Exception {
        BlockedPeriod period = samplePeriod();
        when(repository.save(any())).thenReturn(period);

        mockMvc.perform(post("/api/admin/blocked-periods")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(period)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reason").value("Spring maintenance"));
    }

    @Test
    @WithMockUser
    void toggle_shouldFlipEnabledState() throws Exception {
        BlockedPeriod period = samplePeriod();
        period.setEnabled(true);

        BlockedPeriod toggled = samplePeriod();
        toggled.setEnabled(false);

        when(repository.findById(1L)).thenReturn(Optional.of(period));
        when(repository.save(any())).thenReturn(toggled);

        mockMvc.perform(patch("/api/admin/blocked-periods/1/toggle").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
    }

    @Test
    @WithMockUser
    void delete_shouldReturn200() throws Exception {
        when(repository.existsById(1L)).thenReturn(true);
        doNothing().when(repository).deleteById(1L);

        mockMvc.perform(delete("/api/admin/blocked-periods/1").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("deleted"));
    }

    @Test
    @WithMockUser
    void delete_shouldReturn404ForMissing() throws Exception {
        when(repository.existsById(99L)).thenReturn(false);

        mockMvc.perform(delete("/api/admin/blocked-periods/99").with(csrf()))
                .andExpect(status().isNotFound());
    }
}
