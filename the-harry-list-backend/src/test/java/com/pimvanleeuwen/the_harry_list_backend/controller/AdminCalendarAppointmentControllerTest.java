package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pimvanleeuwen.the_harry_list_backend.config.SecurityConfig;
import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.service.AdminUserService;
import com.pimvanleeuwen.the_harry_list_backend.model.CalendarAppointment;
import com.pimvanleeuwen.the_harry_list_backend.model.RecurrenceType;
import com.pimvanleeuwen.the_harry_list_backend.repository.CalendarAppointmentRepository;
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
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminCalendarAppointmentController.class)
@Import(SecurityConfig.class)
class AdminCalendarAppointmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminUserService adminUserService;

    @MockitoBean
    private CalendarAppointmentRepository repository;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    private CalendarAppointment sampleAppointment() {
        return CalendarAppointment.builder()
                .id(1L)
                .title("Staff Meeting")
                .description("Weekly team sync")
                .date(LocalDate.of(2026, 6, 1))
                .allDay(false)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .location(BarLocation.HUBBLE)
                .recurrenceType(RecurrenceType.WEEKLY)
                .recurrenceEndDate(LocalDate.of(2026, 12, 31))
                .enabled(true)
                .build();
    }

    private CalendarAppointment sampleAllDayAppointment() {
        return CalendarAppointment.builder()
                .id(2L)
                .title("Holiday Closure")
                .date(LocalDate.of(2026, 12, 25))
                .allDay(true)
                .location(BarLocation.METEOR)
                .recurrenceType(RecurrenceType.NONE)
                .enabled(true)
                .build();
    }

    @Test
    @WithMockUser
    void listAll_shouldReturnAllAppointments() throws Exception {
        when(repository.findAll()).thenReturn(List.of(sampleAppointment(), sampleAllDayAppointment()));

        mockMvc.perform(get("/api/admin/calendar-appointments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Staff Meeting"))
                .andExpect(jsonPath("$[1].title").value("Holiday Closure"));
    }

    @Test
    void listAll_shouldRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/calendar-appointments"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void getById_shouldReturnAppointment() throws Exception {
        when(repository.findById(1L)).thenReturn(Optional.of(sampleAppointment()));

        mockMvc.perform(get("/api/admin/calendar-appointments/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Staff Meeting"))
                .andExpect(jsonPath("$.location").value("HUBBLE"))
                .andExpect(jsonPath("$.recurrenceType").value("WEEKLY"));
    }

    @Test
    @WithMockUser
    void getById_shouldReturn404ForMissing() throws Exception {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/admin/calendar-appointments/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void create_shouldReturn201() throws Exception {
        CalendarAppointment appointment = sampleAppointment();
        when(repository.save(any())).thenReturn(appointment);

        mockMvc.perform(post("/api/admin/calendar-appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(appointment)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Staff Meeting"));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void create_allDay_shouldReturn201() throws Exception {
        CalendarAppointment appointment = sampleAllDayAppointment();
        when(repository.save(any())).thenReturn(appointment);

        mockMvc.perform(post("/api/admin/calendar-appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(appointment)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.allDay").value(true))
                .andExpect(jsonPath("$.startTime").isEmpty());
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void toggle_shouldFlipEnabledState() throws Exception {
        CalendarAppointment appointment = sampleAppointment();
        appointment.setEnabled(true);

        CalendarAppointment toggled = sampleAppointment();
        toggled.setEnabled(false);

        when(repository.findById(1L)).thenReturn(Optional.of(appointment));
        when(repository.save(any())).thenReturn(toggled);

        mockMvc.perform(patch("/api/admin/calendar-appointments/1/toggle").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void delete_shouldReturn200() throws Exception {
        when(repository.existsById(1L)).thenReturn(true);
        doNothing().when(repository).deleteById(1L);

        mockMvc.perform(delete("/api/admin/calendar-appointments/1").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("deleted"));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void delete_shouldReturn404ForMissing() throws Exception {
        when(repository.existsById(99L)).thenReturn(false);

        mockMvc.perform(delete("/api/admin/calendar-appointments/99").with(csrf()))
                .andExpect(status().isNotFound());
    }
}
