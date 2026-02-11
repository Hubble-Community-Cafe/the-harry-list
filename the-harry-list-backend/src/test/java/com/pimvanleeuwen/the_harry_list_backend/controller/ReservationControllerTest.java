package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.service.CreateReservationService;
import com.pimvanleeuwen.the_harry_list_backend.service.DeleteReservationService;
import com.pimvanleeuwen.the_harry_list_backend.service.GetReservationService;
import com.pimvanleeuwen.the_harry_list_backend.service.UpdateReservationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for ReservationController.
 */
@WebMvcTest(com.pimvanleeuwen.the_harry_list_backend.controller.open.ReservationController.class)
class ReservationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GetReservationService getReservationService;

    @MockBean
    private CreateReservationService createReservationService;

    @MockBean
    private UpdateReservationService updateReservationService;

    @MockBean
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
    @WithMockUser
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
    @WithMockUser
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
    @WithMockUser
    void getReservationById_shouldReturnNotFoundWhenNotExists() throws Exception {
        // Given
        when(getReservationService.getById(999L)).thenReturn(ResponseEntity.notFound().build());

        // When & Then
        mockMvc.perform(get("/api/reservations/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
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
    @WithMockUser
    void updateReservation_shouldUpdateAndReturnReservation() throws Exception {
        // Given
        sampleReservation.setId(1L);
        sampleReservation.setContactName("Updated Name");
        when(updateReservationService.executeWithEmail(any(Reservation.class), anyBoolean()))
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
    @WithMockUser
    void deleteReservation_shouldReturnNoContent() throws Exception {
        // Given
        when(deleteReservationService.executeWithEmail(1L, true)).thenReturn(ResponseEntity.noContent().build());

        // When & Then
        mockMvc.perform(delete("/api/reservations/1")
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    void deleteReservation_shouldReturnNotFoundWhenNotExists() throws Exception {
        // Given
        when(deleteReservationService.executeWithEmail(999L, true)).thenReturn(ResponseEntity.notFound().build());

        // When & Then
        mockMvc.perform(delete("/api/reservations/999")
                        .with(csrf()))
                .andExpect(status().isNotFound());
    }

    private Reservation createSampleReservation() {
        return Reservation.builder()
                .contactName("John Doe")
                .email("john@example.com")
                .phoneNumber("+31612345678")
                .organizationName("Test Association")
                .eventTitle("Annual Borrel")
                .description("Our yearly drinks event")
                .eventType(EventType.BORREL)
                .organizerType(OrganizerType.ASSOCIATION)
                .expectedGuests(50)
                .eventDate(LocalDate.of(2026, 3, 15))
                .startTime(LocalTime.of(16, 0))
                .endTime(LocalTime.of(22, 0))
                .location(BarLocation.HUBBLE)
                .paymentOption(PaymentOption.PIN)
                .foodRequired(true)
                .dietaryPreference(DietaryPreference.VEGETARIAN)
                .termsAccepted(true)
                .status(ReservationStatus.PENDING)
                .build();
    }
}

