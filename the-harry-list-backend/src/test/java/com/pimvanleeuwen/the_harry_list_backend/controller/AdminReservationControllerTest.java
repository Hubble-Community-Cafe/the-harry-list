package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pimvanleeuwen.the_harry_list_backend.dto.CateringEmailRequest;
import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.repository.EmailAttachmentRepository;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailNotificationService;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailTemplateService;
import com.pimvanleeuwen.the_harry_list_backend.service.ReservationMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for AdminReservationController.
 */
@WebMvcTest(AdminReservationController.class)
class AdminReservationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReservationRepository reservationRepository;

    @MockitoBean
    private ReservationMapper reservationMapper;

    @MockitoBean
    private EmailNotificationService emailNotificationService;

    @MockitoBean
    private EmailTemplateService emailTemplateService;

    @MockitoBean
    private EmailAttachmentRepository emailAttachmentRepository;

    private ObjectMapper objectMapper;
    private Reservation sampleReservation;
    private com.pimvanleeuwen.the_harry_list_backend.dto.Reservation sampleDto;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        sampleReservation = createSampleReservation();
        sampleDto = createSampleDto();
    }

    @Test
    @WithMockUser
    void updateStatus_shouldConfirmReservation() throws Exception {
        // Given
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When/Then
        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "CONFIRMED")
                .param("confirmedBy", "Admin User")
                .param("sendEmail", "true"))
            .andExpect(status().isOk());

        verify(reservationRepository).save(argThat(res ->
            res.getStatus() == ReservationStatus.CONFIRMED &&
            "Admin User".equals(res.getConfirmedBy())
        ));
    }

    @Test
    @WithMockUser
    void updateStatus_shouldRejectReservation() throws Exception {
        // Given
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When/Then
        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "REJECTED"))
            .andExpect(status().isOk());

        verify(reservationRepository).save(argThat(res ->
            res.getStatus() == ReservationStatus.REJECTED
        ));
    }

    @Test
    @WithMockUser
    void updateStatus_shouldCancelReservation() throws Exception {
        // Given
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When/Then
        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "CANCELLED"))
            .andExpect(status().isOk());

        verify(reservationRepository).save(argThat(res ->
            res.getStatus() == ReservationStatus.CANCELLED
        ));
    }

    @Test
    @WithMockUser
    void updateStatus_shouldCompleteReservation() throws Exception {
        // Given
        sampleReservation.setStatus(ReservationStatus.CONFIRMED);
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When/Then
        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "COMPLETED"))
            .andExpect(status().isOk());

        verify(reservationRepository).save(argThat(res ->
            res.getStatus() == ReservationStatus.COMPLETED
        ));
    }

    @Test
    @WithMockUser
    void updateStatus_shouldReturnNotFoundWhenReservationDoesNotExist() throws Exception {
        // Given
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        // When/Then
        mockMvc.perform(patch("/api/admin/reservations/999/status")
                .with(csrf())
                .param("status", "CONFIRMED"))
            .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void updateStatus_shouldSendEmailWhenEnabled() throws Exception {
        // Given
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When
        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "CONFIRMED")
                .param("sendEmail", "true"))
            .andExpect(status().isOk());

        // Then
        verify(emailNotificationService).sendStatusChangeEmail(any(), any(), any());
    }

    @Test
    @WithMockUser
    void updateStatus_shouldNotSendEmailWhenDisabled() throws Exception {
        // Given
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When
        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "CONFIRMED")
                .param("sendEmail", "false"))
            .andExpect(status().isOk());

        // Then
        verify(emailNotificationService, never()).sendStatusChangeEmail(any(), any(), any());
    }

    @Test
    @WithMockUser
    void updateInternalNotes_shouldUpdateNotes() throws Exception {
        // Given
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(reservationRepository.save(any())).thenReturn(sampleReservation);
        when(reservationMapper.toDto(any())).thenReturn(sampleDto);

        // When/Then
        mockMvc.perform(patch("/api/admin/reservations/1/notes")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("\"These are internal notes\""))
            .andExpect(status().isOk());

        verify(reservationRepository).save(any());
    }

    @Test
    @WithMockUser
    void updateInternalNotes_shouldReturnNotFoundWhenReservationDoesNotExist() throws Exception {
        // Given
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        // When/Then
        mockMvc.perform(patch("/api/admin/reservations/999/notes")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("\"These are internal notes\""))
            .andExpect(status().isNotFound());
    }

    @Test
    void updateStatus_shouldRequireAuthentication() throws Exception {
        // When/Then - no @WithMockUser
        mockMvc.perform(patch("/api/admin/reservations/1/status")
                .with(csrf())
                .param("status", "CONFIRMED"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void previewCateringEmail_shouldReturnRenderedTemplate() throws Exception {
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(emailTemplateService.getRenderedSubject(eq(EmailTemplateType.CATERING_OPTIONS), any()))
                .thenReturn("Catering Options for Test Event");
        when(emailTemplateService.getRenderedBody(eq(EmailTemplateType.CATERING_OPTIONS), any()))
                .thenReturn("<p>Hello John</p>");

        mockMvc.perform(get("/api/admin/reservations/1/catering-email/preview"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.subject").value("Catering Options for Test Event"))
            .andExpect(jsonPath("$.body").value("<p>Hello John</p>"));
    }

    @Test
    @WithMockUser
    void previewCateringEmail_shouldReturn404WhenNotFound() throws Exception {
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/admin/reservations/999/catering-email/preview"))
            .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void sendCateringEmail_shouldSendWithAttachments() throws Exception {
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(emailTemplateService.getRenderedSubject(eq(EmailTemplateType.CATERING_OPTIONS), any()))
                .thenReturn("Catering Subject");
        when(emailTemplateService.getRenderedBody(eq(EmailTemplateType.CATERING_OPTIONS), any()))
                .thenReturn("<p>Body</p>");

        EmailAttachment attachment = EmailAttachment.builder()
                .id(1L).name("Menu").filename("menu.pdf")
                .contentType("application/pdf").data(new byte[]{1, 2, 3}).active(true).build();
        when(emailAttachmentRepository.findAllById(List.of(1L))).thenReturn(List.of(attachment));

        String requestBody = objectMapper.writeValueAsString(
                new CateringEmailRequest() {{ setAttachmentIds(List.of(1L)); }});

        mockMvc.perform(post("/api/admin/reservations/1/catering-email")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("sent"));

        verify(emailNotificationService).sendEmailWithAttachments(
                eq("john@example.com"), anyString(), anyString(), eq(List.of(attachment)), any());
    }

    @Test
    @WithMockUser
    void sendCateringEmail_shouldUseCustomSubjectAndBody() throws Exception {
        when(reservationRepository.findById(1L)).thenReturn(Optional.of(sampleReservation));
        when(emailAttachmentRepository.findAllById(any())).thenReturn(List.of());

        CateringEmailRequest request = new CateringEmailRequest();
        request.setAttachmentIds(List.of());
        request.setSubject("Custom Subject");
        request.setBody("<p>Custom body</p>");
        request.setReplyTo("custom@example.com");

        mockMvc.perform(post("/api/admin/reservations/1/catering-email")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("sent"));

        verify(emailNotificationService).sendEmailWithAttachments(
                eq("john@example.com"), eq("Custom Subject"), eq("<p>Custom body</p>"),
                eq(List.of()), eq("custom@example.com"));
    }

    @Test
    @WithMockUser
    void sendCateringEmail_shouldReturn404WhenNotFound() throws Exception {
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        CateringEmailRequest request = new CateringEmailRequest();
        request.setAttachmentIds(List.of());

        mockMvc.perform(post("/api/admin/reservations/999/catering-email")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isNotFound());
    }

    private Reservation createSampleReservation() {
        Reservation reservation = new Reservation();
        reservation.setId(1L);
        reservation.setEventTitle("Test Event");
        reservation.setContactName("John Doe");
        reservation.setEmail("john@example.com");
        reservation.setPhoneNumber("+31612345678");
        reservation.setEventDate(LocalDate.now().plusDays(7));
        reservation.setStartTime(LocalTime.of(14, 0));
        reservation.setEndTime(LocalTime.of(17, 0));
        reservation.setLocation(BarLocation.HUBBLE);
        reservation.setExpectedGuests(20);
        reservation.setStatus(ReservationStatus.PENDING);
        reservation.setConfirmationNumber("ABC123");
        return reservation;
    }

    private com.pimvanleeuwen.the_harry_list_backend.dto.Reservation createSampleDto() {
        com.pimvanleeuwen.the_harry_list_backend.dto.Reservation dto =
            new com.pimvanleeuwen.the_harry_list_backend.dto.Reservation();
        dto.setId(1L);
        dto.setEventTitle("Test Event");
        dto.setContactName("John Doe");
        dto.setEmail("john@example.com");
        dto.setStatus(ReservationStatus.PENDING);
        return dto;
    }
}

