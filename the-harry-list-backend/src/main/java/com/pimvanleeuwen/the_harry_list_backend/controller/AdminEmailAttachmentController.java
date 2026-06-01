package com.pimvanleeuwen.the_harry_list_backend.controller;

import com.pimvanleeuwen.the_harry_list_backend.dto.EmailAttachmentDto;
import com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditAction;
import com.pimvanleeuwen.the_harry_list_backend.model.AuditEntityType;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailAttachment;
import com.pimvanleeuwen.the_harry_list_backend.repository.EmailAttachmentRepository;
import com.pimvanleeuwen.the_harry_list_backend.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/email-attachments")
@Tag(name = "Admin - Email Attachments", description = "Manage PDF attachments for catering emails")
@SecurityRequirement(name = "basicAuth")
public class AdminEmailAttachmentController {

    private static final Logger log = LoggerFactory.getLogger(AdminEmailAttachmentController.class);
    private static final long MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB (Graph API inline attachment limit)

    private final EmailAttachmentRepository repository;
    private final AuditService auditService;

    public AdminEmailAttachmentController(EmailAttachmentRepository repository, AuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    @GetMapping
    @Operation(summary = "List all attachments", description = "Returns all email attachments (without binary data)")
    public ResponseEntity<List<EmailAttachmentDto>> listAttachments() {
        List<EmailAttachmentDto> attachments = repository.findAll().stream()
                .map(EmailAttachmentDto::fromEntity)
                .toList();
        return ResponseEntity.ok(attachments);
    }

    @PostMapping(consumes = "multipart/form-data")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Upload a PDF attachment", description = "Upload a PDF file to use as email attachment")
    public ResponseEntity<?> uploadAttachment(
            @RequestParam("file") MultipartFile file,
            @RequestParam("name") String name) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "File is empty"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.equals("application/pdf")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only PDF files are allowed"));
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body(Map.of("message", "File size exceeds 3MB limit"));
        }

        try {
            EmailAttachment attachment = EmailAttachment.builder()
                    .name(name.trim())
                    .filename(file.getOriginalFilename())
                    .contentType(contentType)
                    .data(file.getBytes())
                    .active(true)
                    .build();

            EmailAttachment saved = repository.save(attachment);
            log.info("Uploaded email attachment: id={} name='{}' filename='{}'", saved.getId(), saved.getName(), saved.getFilename());
            auditService.recordCreate(AuditEntityType.EMAIL_ATTACHMENT, saved.getId(),
                    "Attachment: " + saved.getName(), List.of(),
                    "Attachment uploaded (" + saved.getFilename() + ")");
            return ResponseEntity.ok(EmailAttachmentDto.fromEntity(saved));
        } catch (IOException e) {
            log.error("Failed to read uploaded file", e);
            return ResponseEntity.internalServerError().body(Map.of("message", "Failed to process file"));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Delete an attachment", description = "Permanently delete an email attachment")
    public ResponseEntity<Void> deleteAttachment(@PathVariable Long id) {
        return repository.findById(id)
                .map(attachment -> {
                    repository.delete(attachment);
                    log.info("Deleted email attachment: id={}", id);
                    auditService.recordDelete(AuditEntityType.EMAIL_ATTACHMENT, id,
                            "Attachment: " + attachment.getName(), "Attachment deleted");
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/active")
    @PreAuthorize("hasRole('EDITOR')")
    @Operation(summary = "Toggle attachment active status", description = "Enable or disable an attachment")
    public ResponseEntity<?> toggleActive(@PathVariable Long id, @RequestParam boolean active) {
        return repository.findById(id)
                .map(attachment -> {
                    boolean previous = attachment.isActive();
                    attachment.setActive(active);
                    EmailAttachment saved = repository.save(attachment);
                    log.info("Toggled email attachment active: id={} active={}", id, active);
                    auditService.recordAction(AuditEntityType.EMAIL_ATTACHMENT, id,
                            "Attachment: " + saved.getName(), AuditAction.TOGGLE,
                            List.of(new FieldChange("active", String.valueOf(previous), String.valueOf(active))),
                            "Attachment " + (active ? "activated" : "deactivated"));
                    return ResponseEntity.ok(EmailAttachmentDto.fromEntity(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
