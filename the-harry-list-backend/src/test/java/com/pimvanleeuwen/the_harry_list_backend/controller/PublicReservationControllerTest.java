package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pimvanleeuwen.the_harry_list_backend.config.SecurityConfig;
import com.pimvanleeuwen.the_harry_list_backend.dto.PublicReservationRequest;
import com.pimvanleeuwen.the_harry_list_backend.dto.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.service.CreateReservationService;
import com.pimvanleeuwen.the_harry_list_backend.service.RecaptchaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests for PublicReservationController.
 * Verifies that public reservation submission works without authentication.
 */
@WebMvcTest(com.pimvanleeuwen.the_harry_list_backend.controller.open.PublicReservationController.class)
@Import(SecurityConfig.class)
class PublicReservationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CreateReservationService createReservationService;

    @MockitoBean
    private RecaptchaService recaptchaService;

    private ObjectMapper objectMapper;
    private PublicReservationRequest sampleRequest;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        sampleRequest = createSampleRequest();

        // By default, reCAPTCHA is disabled for tests
        when(recaptchaService.isEnabled()).thenReturn(false);
    }

    @Test
    void submitReservation_shouldWorkWithoutAuthentication() throws Exception {
        // Given
        Reservation responseReservation = sampleRequest.toReservation();
        responseReservation.setId(1L);
        responseReservation.setConfirmationNumber("ABC123");
        when(createReservationService.execute(any(Reservation.class)))
                .thenReturn(ResponseEntity.status(201).body(responseReservation));

        // When & Then - No authentication required!
        mockMvc.perform(post("/api/public/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.confirmationNumber").value("ABC123"))
                .andExpect(jsonPath("$.eventTitle").value("Annual Borrel"))
                .andExpect(jsonPath("$.contactName").value("John Doe"))
                .andExpect(jsonPath("$.email").value("john@example.com"))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void submitReservation_shouldReturnConfirmationMessage() throws Exception {
        // Given
        Reservation responseReservation = sampleRequest.toReservation();
        responseReservation.setId(42L);
        responseReservation.setConfirmationNumber("XYZ789");
        when(createReservationService.execute(any(Reservation.class)))
                .thenReturn(ResponseEntity.status(201).body(responseReservation));

        // When & Then
        mockMvc.perform(post("/api/public/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.confirmationNumber").value("XYZ789"))
                .andExpect(jsonPath("$.message").value(
                    "Your reservation request has been submitted successfully. " +
                    "We will review your request and contact you at john@example.com soon."
                ));
    }

    @Test
    void submitReservation_shouldFailWhenRecaptchaEnabledAndVerificationFails() throws Exception {
        // Given - reCAPTCHA enabled but verification fails
        when(recaptchaService.isEnabled()).thenReturn(true);
        when(recaptchaService.verifyToken(any(), any())).thenReturn(false);

        // When & Then
        mockMvc.perform(post("/api/public/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("RECAPTCHA_FAILED"));
    }

    @Test
    void submitReservation_shouldSucceedWhenRecaptchaEnabledAndVerificationPasses() throws Exception {
        // Given - reCAPTCHA enabled and verification passes
        when(recaptchaService.isEnabled()).thenReturn(true);
        when(recaptchaService.verifyToken(any(), any())).thenReturn(true);

        Reservation responseReservation = sampleRequest.toReservation();
        responseReservation.setId(1L);
        responseReservation.setConfirmationNumber("ABC123");
        when(createReservationService.execute(any(Reservation.class)))
                .thenReturn(ResponseEntity.status(201).body(responseReservation));

        sampleRequest.setRecaptchaToken("valid-token");

        // When & Then
        mockMvc.perform(post("/api/public/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.confirmationNumber").value("ABC123"));
    }

    @Test
    void getRecaptchaStatus_shouldReturnStatus() throws Exception {
        when(recaptchaService.isEnabled()).thenReturn(true);

        mockMvc.perform(get("/api/public/reservations/recaptcha-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true));
    }

    private PublicReservationRequest createSampleRequest() {
        return PublicReservationRequest.builder()
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
                .paymentOption(PaymentOption.INDIVIDUAL)
                .foodRequired(true)
                .dietaryPreference(DietaryPreference.VEGETARIAN)
                .termsAccepted(true)
                .build();
    }
}

