package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pimvanleeuwen.the_harry_list_backend.config.SecurityConfig;
import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.service.AdminUserService;
import com.pimvanleeuwen.the_harry_list_backend.service.CreateReservationService;
import com.pimvanleeuwen.the_harry_list_backend.service.DeleteReservationService;
import com.pimvanleeuwen.the_harry_list_backend.service.GetReservationService;
import com.pimvanleeuwen.the_harry_list_backend.service.UpdateReservationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for ReservationController, run under the production security config so the
 * role checks are exercised: VIEWER may read, only EDITOR (or ADMIN) may create, edit or delete.
 */
@WebMvcTest(com.pimvanleeuwen.the_harry_list_backend.controller.open.ReservationController.class)
@Import(SecurityConfig.class)
class ReservationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminUserService adminUserService;

    @MockitoBean
    private GetReservationService getReservationService;

    @MockitoBean
    private CreateReservationService createReservationService;

    @MockitoBean
    private UpdateReservationService updateReservationService;

    @MockitoBean
    private DeleteReservationService deleteReservationService;

    private ObjectMapper objectMapper;
    private Reservation sampleReservation;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        sampleReservation = createSampleReservation();
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    void getReservations_shouldReturnListOfReservations() throws Exception {
        // Given
        List<Reservation> reservations = Arrays.asList(sampleReservation);
        when(getReservationService.execute(null)).thenReturn(ResponseEntity.ok(reservations));

        // When & Then
        mockMvc.perform(get("/api/reservations"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$[0].contactName").value("John Doe"))
                .andExpect(jsonPath("$[0].email").value("john@example.com"));
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    void getReservationById_shouldReturnReservation() throws Exception {
        // Given
        when(getReservationService.getById(1L)).thenReturn(ResponseEntity.ok(sampleReservation));

        // When & Then
        mockMvc.perform(get("/api/reservations/1"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.contactName").value("John Doe"));
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    void getReservationById_shouldReturnNotFoundWhenNotExists() throws Exception {
        // Given
        when(getReservationService.getById(999L)).thenReturn(ResponseEntity.notFound().build());

        // When & Then
        mockMvc.perform(get("/api/reservations/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void createReservation_shouldCreateAndReturnReservation() throws Exception {
        // Given
        sampleReservation.setId(1L);
        when(createReservationService.execute(any(Reservation.class)))
                .thenReturn(ResponseEntity.status(201).body(sampleReservation));

        // When & Then
        mockMvc.perform(post("/api/reservations")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleReservation)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.contactName").value("John Doe"));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateReservation_shouldUpdateAndReturnReservation() throws Exception {
        // Given
        sampleReservation.setId(1L);
        sampleReservation.setContactName("Updated Name");
        when(updateReservationService.executeWithEmail(any(Reservation.class), anyBoolean(), any()))
                .thenReturn(ResponseEntity.ok(sampleReservation));

        // When & Then
        mockMvc.perform(put("/api/reservations/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleReservation)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contactName").value("Updated Name"));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateReservation_shouldRejectNullGuestCount() throws Exception {
        // A client sending expectedGuests=null used to be accepted, because @Positive
        // only rejects non-null values <= 0. The row was then persisted with a null
        // guest count, which crashed the admin detail page on render.
        sampleReservation.setId(1L);
        sampleReservation.setExpectedGuests(null);

        mockMvc.perform(put("/api/reservations/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleReservation)))
                .andExpect(status().isBadRequest());

        verify(updateReservationService, never()).executeWithEmail(any(), anyBoolean(), any());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateReservation_shouldRejectZeroOrNegativeGuestCount() throws Exception {
        sampleReservation.setId(1L);
        sampleReservation.setExpectedGuests(0);

        mockMvc.perform(put("/api/reservations/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleReservation)))
                .andExpect(status().isBadRequest());

        verify(updateReservationService, never()).executeWithEmail(any(), anyBoolean(), any());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void deleteReservation_shouldReturnNoContent() throws Exception {
        // Given
        when(deleteReservationService.executeWithEmail(1L, true)).thenReturn(ResponseEntity.noContent().build());

        // When & Then
        mockMvc.perform(delete("/api/reservations/1")
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void deleteReservation_shouldReturnNotFoundWhenNotExists() throws Exception {
        // Given
        when(deleteReservationService.executeWithEmail(999L, true)).thenReturn(ResponseEntity.notFound().build());

        // When & Then
        mockMvc.perform(delete("/api/reservations/999")
                        .with(csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void unauthenticated_shouldBeRejected() throws Exception {
        mockMvc.perform(get("/api/reservations"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    void viewer_cannotCreateReservation() throws Exception {
        mockMvc.perform(post("/api/reservations")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleReservation)))
                .andExpect(status().isForbidden());

        verify(createReservationService, never()).execute(any());
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    void viewer_cannotUpdateReservation() throws Exception {
        sampleReservation.setId(1L);

        mockMvc.perform(put("/api/reservations/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleReservation)))
                .andExpect(status().isForbidden());

        verify(updateReservationService, never()).executeWithEmail(any(), anyBoolean(), any());
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    void viewer_cannotDeleteReservation() throws Exception {
        mockMvc.perform(delete("/api/reservations/1")
                        .with(csrf()))
                .andExpect(status().isForbidden());

        verify(deleteReservationService, never()).executeWithEmail(any(), anyBoolean());
    }

    @Test
    @WithMockUser
    void authenticatedWithoutRole_cannotReadReservations() throws Exception {
        // A token the role filter could not resolve to a user carries no ROLE_ authority.
        mockMvc.perform(get("/api/reservations"))
                .andExpect(status().isForbidden());

        verify(getReservationService, never()).execute(any());
    }

    @Test
    @WithMockUser(roles = {"VIEWER", "EDITOR", "ADMIN"})
    void admin_canDeleteReservation() throws Exception {
        when(deleteReservationService.executeWithEmail(1L, false)).thenReturn(ResponseEntity.noContent().build());

        mockMvc.perform(delete("/api/reservations/1")
                        .param("sendEmail", "false")
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    private Reservation createSampleReservation() {
        return Reservation.builder()
                .contactName("John Doe")
                .email("john@example.com")
                .phoneNumber("+31612345678")
                .organizationName("Test Association")
                .eventTitle("Annual Borrel")
                .description("Our yearly drinks event")
                .specialActivities(Set.of(SpecialActivity.GRADUATION))
                .expectedGuests(50)
                .eventDate(LocalDate.of(2026, 3, 15))
                .startTime(LocalTime.of(16, 0))
                .endTime(LocalTime.of(22, 0))
                .location(BarLocation.HUBBLE)
                .seatingArea(SeatingArea.INSIDE)
                .paymentOption(PaymentOption.INDIVIDUAL)
                .termsAccepted(true)
                .status(ReservationStatus.PENDING)
                .build();
    }
}
