package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.dto.EmailTemplateDto;
import com.pimvanleeuwen.the_harry_list_backend.dto.TestEmailRequest;
import com.pimvanleeuwen.the_harry_list_backend.dto.UpdateEmailTemplateRequest;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailTemplateType;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailNotificationService;
import com.pimvanleeuwen.the_harry_list_backend.service.EmailTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/email-templates")
@Tag(name = "Admin - Email Templates", description = "Manage editable email templates")
public class AdminEmailTemplateController {

    private final EmailTemplateService emailTemplateService;
    private final Optional<EmailNotificationService> emailNotificationService;

    public AdminEmailTemplateController(
            EmailTemplateService emailTemplateService,
            Optional<EmailNotificationService> emailNotificationService) {
        this.emailTemplateService = emailTemplateService;
        this.emailNotificationService = emailNotificationService;
    }

    @GetMapping
    @Operation(summary = "List all email templates", description = "Returns all template types with their current subject, body, and available variables.")
    public ResponseEntity<List<EmailTemplateDto>> listAll() {
        return ResponseEntity.ok(emailTemplateService.findAll());
    }

    @GetMapping("/{type}")
    @Operation(summary = "Get a single email template")
    public ResponseEntity<EmailTemplateDto> getByType(@PathVariable EmailTemplateType type) {
        return emailTemplateService.findByType(type)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{type}")
    @Operation(summary = "Save a custom email template", description = "Saves a custom subject and body for the given template type. Use {{variable}} placeholders.")
    public ResponseEntity<EmailTemplateDto> update(
            @PathVariable EmailTemplateType type,
            @Valid @RequestBody UpdateEmailTemplateRequest request) {
        EmailTemplateDto updated = emailTemplateService.update(type, request.getSubject(), request.getBodyTemplate());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{type}")
    @Operation(summary = "Reset template to default", description = "Removes any custom template, reverting to the built-in default.")
    public ResponseEntity<Void> reset(@PathVariable EmailTemplateType type) {
        emailTemplateService.reset(type);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{type}/test")
    @Operation(
        summary = "Send a test email",
        description = "Renders the template with sample data and sends it to the provided address. " +
                      "Optionally supply subject/bodyTemplate to preview unsaved changes.")
    public ResponseEntity<Map<String, String>> sendTestEmail(
            @PathVariable EmailTemplateType type,
            @Valid @RequestBody TestEmailRequest request) {

        if (emailNotificationService.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                "status", "disabled",
                "message", "Email sending is disabled (app.mail.enabled=false)."));
        }

        Map<String, String> sampleVars = emailTemplateService.buildSampleVariables(type);

        String subject = (request.getSubject() != null && !request.getSubject().isBlank())
                ? emailTemplateService.renderForTest(request.getSubject(), sampleVars)
                : emailTemplateService.getRenderedSubject(type, sampleVars);

        String body = (request.getBodyTemplate() != null && !request.getBodyTemplate().isBlank())
                ? emailTemplateService.renderForTest(request.getBodyTemplate(), sampleVars)
                : emailTemplateService.getRenderedBody(type, sampleVars);

        try {
            emailNotificationService.get().sendRawEmail(request.getToEmail(), subject, body);
            return ResponseEntity.ok(Map.of(
                "status", "sent",
                "message", "Test email sent to " + request.getToEmail()));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "status", "error",
                "message", "Failed to send: " + e.getMessage()));
        }
    }
}
