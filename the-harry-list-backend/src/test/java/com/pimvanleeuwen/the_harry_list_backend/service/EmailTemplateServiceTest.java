package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.dto.EmailTemplateDto;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailTemplate;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailTemplateType;
import com.pimvanleeuwen.the_harry_list_backend.repository.EmailTemplateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EmailTemplateServiceTest {

    @Mock
    private EmailTemplateRepository repository;

    @InjectMocks
    private EmailTemplateService service;

    @BeforeEach
    void setUp() {
        when(repository.findByTemplateType(any())).thenReturn(Optional.empty());
    }

    // --- Rendering ---

    @Test
    void getRenderedBody_shouldSubstituteVariables() {
        String body = service.getRenderedBody(EmailTemplateType.SUBMITTED,
                Map.of("contactName", "Alice", "eventTitle", "Borrel", "confirmationNumber", "ABC123",
                        "eventDate", "Monday, March 16, 2026", "startTime", "18:00", "endTime", "22:00",
                        "location", "Hubble", "expectedGuests", "30", "barName", "Hubble Cafe"));

        assertTrue(body.contains("Alice"));
        assertTrue(body.contains("ABC123"));
        assertTrue(body.contains("Borrel"));
    }

    @Test
    void getRenderedSubject_shouldSubstituteVariables() {
        String subject = service.getRenderedSubject(EmailTemplateType.SUBMITTED,
                Map.of("eventTitle", "My Event", "contactName", "Alice", "confirmationNumber", "X",
                        "eventDate", "date", "startTime", "18:00", "endTime", "22:00",
                        "location", "Hubble", "expectedGuests", "10", "barName", "Cafe"));

        assertEquals("Reservation Request Received - My Event", subject);
    }

    @Test
    void getRenderedBody_shouldUseDbTemplateWhenPresent() {
        EmailTemplate dbTemplate = EmailTemplate.builder()
                .templateType(EmailTemplateType.SUBMITTED)
                .subject("Custom subject")
                .bodyTemplate("Hello {{contactName}}, your event is {{eventTitle}}.")
                .build();
        when(repository.findByTemplateType(EmailTemplateType.SUBMITTED)).thenReturn(Optional.of(dbTemplate));

        String body = service.getRenderedBody(EmailTemplateType.SUBMITTED,
                Map.of("contactName", "Bob", "eventTitle", "Conference"));

        assertEquals("Hello Bob, your event is Conference.", body);
    }

    @Test
    void getRenderedSubject_shouldUseDbSubjectWhenPresent() {
        EmailTemplate dbTemplate = EmailTemplate.builder()
                .templateType(EmailTemplateType.SUBMITTED)
                .subject("Custom: {{eventTitle}}")
                .bodyTemplate("body")
                .build();
        when(repository.findByTemplateType(EmailTemplateType.SUBMITTED)).thenReturn(Optional.of(dbTemplate));

        String subject = service.getRenderedSubject(EmailTemplateType.SUBMITTED,
                Map.of("eventTitle", "My Party"));

        assertEquals("Custom: My Party", subject);
    }

    @Test
    void render_shouldHtmlEscapeVariableValues() {
        EmailTemplate dbTemplate = EmailTemplate.builder()
                .templateType(EmailTemplateType.SUBMITTED)
                .subject("subj")
                .bodyTemplate("Name: {{contactName}}")
                .build();
        when(repository.findByTemplateType(EmailTemplateType.SUBMITTED)).thenReturn(Optional.of(dbTemplate));

        String body = service.getRenderedBody(EmailTemplateType.SUBMITTED,
                Map.of("contactName", "<script>alert('xss')</script>"));

        assertFalse(body.contains("<script>"));
        assertTrue(body.contains("&lt;script&gt;"));
    }

    @Test
    void render_shouldLeaveUnknownPlaceholdersUnreplaced() {
        EmailTemplate dbTemplate = EmailTemplate.builder()
                .templateType(EmailTemplateType.SUBMITTED)
                .subject("subj")
                .bodyTemplate("Hello {{contactName}} {{unknownVar}}")
                .build();
        when(repository.findByTemplateType(EmailTemplateType.SUBMITTED)).thenReturn(Optional.of(dbTemplate));

        String body = service.getRenderedBody(EmailTemplateType.SUBMITTED,
                Map.of("contactName", "Alice"));

        assertTrue(body.contains("Alice"));
        assertTrue(body.contains("{{unknownVar}}"));
    }

    @Test
    void render_shouldHandleNullVariableValues() {
        EmailTemplate dbTemplate = EmailTemplate.builder()
                .templateType(EmailTemplateType.SUBMITTED)
                .subject("subj")
                .bodyTemplate("Phone: {{phone}}")
                .build();
        when(repository.findByTemplateType(EmailTemplateType.SUBMITTED)).thenReturn(Optional.of(dbTemplate));

        Map<String, String> vars = new java.util.HashMap<>();
        vars.put("phone", null);

        String body = service.getRenderedBody(EmailTemplateType.SUBMITTED, vars);

        assertEquals("Phone: ", body);
    }

    @Test
    void statusChangedTemplate_shouldContainStatusColorVariable() {
        Map<String, String> vars = new java.util.HashMap<>();
        vars.put("statusColor", "#4CAF50");
        vars.put("status", "Confirmed");
        vars.put("statusMessage", "Your reservation is confirmed!");
        vars.put("contactName", "Alice");
        vars.put("confirmationNumber", "X");
        vars.put("eventTitle", "Borrel");
        vars.put("eventDate", "Monday");
        vars.put("startTime", "18:00");
        vars.put("endTime", "22:00");
        vars.put("location", "Hubble");
        vars.put("expectedGuests", "20");
        vars.put("barName", "Hubble Cafe");
        vars.put("staffEmail", "staff@hubble.cafe");
        vars.put("statusSubject", "Reservation Confirmed");
        String body = service.getRenderedBody(EmailTemplateType.STATUS_CHANGED, vars);

        assertTrue(body.contains("#4CAF50"));
        assertTrue(body.contains("Confirmed"));
        assertTrue(body.contains("Your reservation is confirmed!"));
    }

    @Test
    void cateringOptionsTemplate_shouldContainReservationDetails() {
        Map<String, String> vars = new java.util.HashMap<>();
        vars.put("contactName", "Alice");
        vars.put("confirmationNumber", "CAT123");
        vars.put("eventTitle", "Team Lunch");
        vars.put("eventDate", "Friday, April 10, 2026");
        vars.put("startTime", "12:00");
        vars.put("endTime", "14:00");
        vars.put("location", "Hubble");
        vars.put("expectedGuests", "15");
        vars.put("barName", "Hubble Cafe");
        vars.put("staffEmail", "events@hubble.cafe");

        String body = service.getRenderedBody(EmailTemplateType.CATERING_OPTIONS, vars);
        String subject = service.getRenderedSubject(EmailTemplateType.CATERING_OPTIONS, vars);

        assertTrue(body.contains("Alice"));
        assertTrue(body.contains("Team Lunch"));
        assertTrue(body.contains("15"));
        assertTrue(subject.contains("Team Lunch"));
    }

    // --- Custom message block ---

    private Map<String, String> statusChangeVars() {
        Map<String, String> vars = new java.util.HashMap<>();
        vars.put("statusColor", "#f44336");
        vars.put("status", "Rejected");
        vars.put("statusMessage", "Unfortunately, we're unable to accommodate your request.");
        vars.put("contactName", "Alice");
        vars.put("confirmationNumber", "X");
        vars.put("eventTitle", "Borrel");
        vars.put("eventDate", "Monday");
        vars.put("startTime", "18:00");
        vars.put("endTime", "22:00");
        vars.put("location", "Hubble");
        vars.put("expectedGuests", "20");
        vars.put("barName", "Hubble Cafe");
        vars.put("staffEmail", "staff@hubble.cafe");
        vars.put("statusSubject", "Reservation Request Update");
        return vars;
    }

    @Test
    void statusChanged_shouldInjectCustomMessageBlockWhenProvided() {
        String block = EmailTemplates.buildCustomMessageBlock("We will keep a shaded spot for you.");
        String body = service.getRenderedBody(EmailTemplateType.STATUS_CHANGED,
                statusChangeVars(), Map.of("customMessage", block));

        assertTrue(body.contains("We will keep a shaded spot for you."));
        // The block HTML must survive verbatim (not double-escaped).
        assertTrue(body.contains("border-left: 4px solid #6b46c1"));
        assertFalse(body.contains("{{customMessage}}"));
    }

    @Test
    void statusChanged_shouldOmitCustomMessageWhenNoneProvided() {
        // The 2-arg overload defaults the block to empty for status-change emails.
        String body = service.getRenderedBody(EmailTemplateType.STATUS_CHANGED, statusChangeVars());

        assertFalse(body.contains("{{customMessage}}"), "Placeholder must not render literally");
        assertFalse(body.contains("border-left: 4px solid #6b46c1"), "No block when no message");
    }

    @Test
    void updated_shouldInjectCustomMessageBlockWhenProvided() {
        Map<String, String> vars = new java.util.HashMap<>();
        vars.put("contactName", "Bob");
        vars.put("confirmationNumber", "U1");
        vars.put("eventTitle", "Workshop");
        vars.put("eventDate", "Tuesday");
        vars.put("startTime", "10:00");
        vars.put("endTime", "12:00");
        vars.put("location", "Meteor");
        vars.put("expectedGuests", "12");
        vars.put("status", "Confirmed");
        vars.put("barName", "Meteor Cafe");

        String block = EmailTemplates.buildCustomMessageBlock("We moved you to the larger room.");
        String body = service.getRenderedBody(EmailTemplateType.UPDATED, vars,
                Map.of("customMessage", block));

        assertTrue(body.contains("We moved you to the larger room."));
        assertFalse(body.contains("{{customMessage}}"));
    }

    @Test
    void customMessageBlock_shouldEscapeHtmlButRenderVerbatim() {
        String block = EmailTemplates.buildCustomMessageBlock("<script>alert('x')</script>");
        String body = service.getRenderedBody(EmailTemplateType.STATUS_CHANGED,
                statusChangeVars(), Map.of("customMessage", block));

        assertFalse(body.contains("<script>"), "Message text must be escaped");
        assertTrue(body.contains("&lt;script&gt;"));
        // The wrapping div is intentional HTML and must remain.
        assertTrue(body.contains("<div"));
    }

    @Test
    void buildCustomMessageBlock_shouldReturnEmptyForBlankOrNull() {
        assertEquals("", EmailTemplates.buildCustomMessageBlock(null));
        assertEquals("", EmailTemplates.buildCustomMessageBlock(""));
        assertEquals("", EmailTemplates.buildCustomMessageBlock("   "));
    }

    @Test
    void buildCustomMessageBlock_shouldConvertNewlinesToBreaks() {
        String block = EmailTemplates.buildCustomMessageBlock("line one\nline two");
        assertTrue(block.contains("line one<br>line two"));
    }

    @Test
    void availableVariables_shouldIncludeCustomMessageForStatusAndUpdatedOnly() {
        assertTrue(service.getAvailableVariables(EmailTemplateType.STATUS_CHANGED).contains("customMessage"));
        assertTrue(service.getAvailableVariables(EmailTemplateType.UPDATED).contains("customMessage"));
        assertFalse(service.getAvailableVariables(EmailTemplateType.SUBMITTED).contains("customMessage"));
        assertFalse(service.getAvailableVariables(EmailTemplateType.CANCELLED).contains("customMessage"));
    }

    @Test
    void buildSampleRawHtmlVariables_shouldProvideBlockForStatusAndUpdatedOnly() {
        assertTrue(service.buildSampleRawHtmlVariables(EmailTemplateType.STATUS_CHANGED)
                .containsKey("customMessage"));
        assertFalse(service.buildSampleRawHtmlVariables(EmailTemplateType.STATUS_CHANGED)
                .get("customMessage").isBlank());
        assertTrue(service.buildSampleRawHtmlVariables(EmailTemplateType.UPDATED)
                .containsKey("customMessage"));
        assertTrue(service.buildSampleRawHtmlVariables(EmailTemplateType.SUBMITTED).isEmpty());
    }

    // --- Default content ---

    @Test
    void getDefaultBody_shouldReturnNonNullForAllTypes() {
        for (EmailTemplateType type : EmailTemplateType.values()) {
            assertNotNull(service.getDefaultBody(type), "Default body missing for " + type);
            assertFalse(service.getDefaultBody(type).isBlank(), "Default body blank for " + type);
        }
    }

    @Test
    void getDefaultSubject_shouldReturnNonNullForAllTypes() {
        for (EmailTemplateType type : EmailTemplateType.values()) {
            assertNotNull(service.getDefaultSubject(type), "Default subject missing for " + type);
            assertFalse(service.getDefaultSubject(type).isBlank(), "Default subject blank for " + type);
        }
    }

    @Test
    void getAvailableVariables_shouldReturnNonEmptyForAllTypes() {
        for (EmailTemplateType type : EmailTemplateType.values()) {
            List<String> vars = service.getAvailableVariables(type);
            assertNotNull(vars);
            assertFalse(vars.isEmpty(), "No variables defined for " + type);
        }
    }

    // --- CRUD ---

    @Test
    void findAll_shouldReturnAllFiveTemplateTypes() {
        List<EmailTemplateDto> all = service.findAll();
        assertEquals(EmailTemplateType.values().length, all.size());
    }

    @Test
    void findAll_shouldMarkCustomizedWhenDbEntryExists() {
        when(repository.findByTemplateType(EmailTemplateType.SUBMITTED)).thenReturn(
                Optional.of(EmailTemplate.builder()
                        .templateType(EmailTemplateType.SUBMITTED)
                        .subject("Custom")
                        .bodyTemplate("body")
                        .build()));

        List<EmailTemplateDto> all = service.findAll();

        EmailTemplateDto submitted = all.stream()
                .filter(t -> t.getTemplateType() == EmailTemplateType.SUBMITTED)
                .findFirst().orElseThrow();
        assertTrue(submitted.isCustomized());

        all.stream()
                .filter(t -> t.getTemplateType() != EmailTemplateType.SUBMITTED)
                .forEach(t -> assertFalse(t.isCustomized()));
    }

    @Test
    void findByType_shouldReturnDtoWithCorrectFields() {
        Optional<EmailTemplateDto> result = service.findByType(EmailTemplateType.CANCELLED);

        assertTrue(result.isPresent());
        EmailTemplateDto dto = result.get();
        assertEquals(EmailTemplateType.CANCELLED, dto.getTemplateType());
        assertNotNull(dto.getDisplayName());
        assertNotNull(dto.getDescription());
        assertFalse(dto.isCustomized());
        assertFalse(dto.getAvailableVariables().isEmpty());
    }

    @Test
    void update_shouldSaveNewTemplate() {
        when(repository.findByTemplateType(EmailTemplateType.UPDATED)).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.update(EmailTemplateType.UPDATED, "New subject", "<p>New body</p>");

        verify(repository).save(argThat(t ->
                t.getTemplateType() == EmailTemplateType.UPDATED
                && "New subject".equals(t.getSubject())
                && "<p>New body</p>".equals(t.getBodyTemplate())));
    }

    @Test
    void update_shouldOverwriteExistingTemplate() {
        EmailTemplate existing = EmailTemplate.builder()
                .templateType(EmailTemplateType.UPDATED)
                .subject("Old subject")
                .bodyTemplate("Old body")
                .build();
        when(repository.findByTemplateType(EmailTemplateType.UPDATED)).thenReturn(Optional.of(existing));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.update(EmailTemplateType.UPDATED, "New subject", "New body");

        verify(repository).save(argThat(t ->
                "New subject".equals(t.getSubject()) && "New body".equals(t.getBodyTemplate())));
    }

    @Test
    void reset_shouldDeleteDbEntryWhenPresent() {
        EmailTemplate stored = EmailTemplate.builder()
                .templateType(EmailTemplateType.CANCELLED)
                .subject("Custom")
                .bodyTemplate("body")
                .build();
        when(repository.findByTemplateType(EmailTemplateType.CANCELLED)).thenReturn(Optional.of(stored));

        service.reset(EmailTemplateType.CANCELLED);

        verify(repository).delete(stored);
    }

    @Test
    void reset_shouldDoNothingWhenNoDbEntry() {
        when(repository.findByTemplateType(EmailTemplateType.CANCELLED)).thenReturn(Optional.empty());

        service.reset(EmailTemplateType.CANCELLED);

        verify(repository, never()).delete(any());
    }
}
