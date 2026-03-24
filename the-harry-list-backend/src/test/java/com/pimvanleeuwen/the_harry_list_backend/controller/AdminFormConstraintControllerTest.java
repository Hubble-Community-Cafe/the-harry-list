package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pimvanleeuwen.the_harry_list_backend.config.SecurityConfig;
import com.pimvanleeuwen.the_harry_list_backend.model.FormConstraint;
import com.pimvanleeuwen.the_harry_list_backend.model.FormConstraintType;
import com.pimvanleeuwen.the_harry_list_backend.repository.FormConstraintRepository;
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
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminFormConstraintController.class)
@Import(SecurityConfig.class)
class AdminFormConstraintControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FormConstraintRepository repository;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
    }

    private FormConstraint sampleConstraint() {
        return FormConstraint.builder()
                .id(1L)
                .constraintType(FormConstraintType.ACTIVITY_CONFLICT)
                .triggerActivity("EAT_CATERING")
                .targetValue("EAT_A_LA_CARTE")
                .message("Cannot combine catering and à la carte")
                .enabled(true)
                .build();
    }

    @Test
    @WithMockUser
    void listAll_shouldReturnAllConstraints() throws Exception {
        when(repository.findAll()).thenReturn(List.of(sampleConstraint()));

        mockMvc.perform(get("/api/admin/form-constraints"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].constraintType").value("ACTIVITY_CONFLICT"))
                .andExpect(jsonPath("$[0].triggerActivity").value("EAT_CATERING"));
    }

    @Test
    void listAll_shouldRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/form-constraints"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void getById_shouldReturnConstraint() throws Exception {
        when(repository.findById(1L)).thenReturn(Optional.of(sampleConstraint()));

        mockMvc.perform(get("/api/admin/form-constraints/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.constraintType").value("ACTIVITY_CONFLICT"));
    }

    @Test
    @WithMockUser
    void getById_shouldReturn404ForMissing() throws Exception {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/admin/form-constraints/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void create_shouldReturn201() throws Exception {
        FormConstraint constraint = sampleConstraint();
        when(repository.save(any())).thenReturn(constraint);

        mockMvc.perform(post("/api/admin/form-constraints")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(constraint)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.constraintType").value("ACTIVITY_CONFLICT"));
    }

    @Test
    @WithMockUser
    void update_shouldUpdateExisting() throws Exception {
        FormConstraint existing = sampleConstraint();
        FormConstraint updated = sampleConstraint();
        updated.setMessage("Updated message");

        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(any())).thenReturn(updated);

        mockMvc.perform(put("/api/admin/form-constraints/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Updated message"));
    }

    @Test
    @WithMockUser
    void update_shouldReturn404ForMissing() throws Exception {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/admin/form-constraints/99")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleConstraint())))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void toggle_shouldFlipEnabledState() throws Exception {
        FormConstraint constraint = sampleConstraint();
        constraint.setEnabled(true);

        FormConstraint toggled = sampleConstraint();
        toggled.setEnabled(false);

        when(repository.findById(1L)).thenReturn(Optional.of(constraint));
        when(repository.save(any())).thenReturn(toggled);

        mockMvc.perform(patch("/api/admin/form-constraints/1/toggle").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
    }

    @Test
    @WithMockUser
    void delete_shouldReturn200() throws Exception {
        when(repository.existsById(1L)).thenReturn(true);
        doNothing().when(repository).deleteById(1L);

        mockMvc.perform(delete("/api/admin/form-constraints/1").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("deleted"));
    }

    @Test
    @WithMockUser
    void delete_shouldReturn404ForMissing() throws Exception {
        when(repository.existsById(99L)).thenReturn(false);

        mockMvc.perform(delete("/api/admin/form-constraints/99").with(csrf()))
                .andExpect(status().isNotFound());
    }
}
