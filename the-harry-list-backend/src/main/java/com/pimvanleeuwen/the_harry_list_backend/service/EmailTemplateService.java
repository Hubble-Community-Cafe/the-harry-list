package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.dto.EmailTemplateDto;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailTemplate;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailTemplateType;
import com.pimvanleeuwen.the_harry_list_backend.repository.EmailTemplateRepository;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Manages editable email templates stored in the database.
 * Falls back to hardcoded default templates when no custom template exists.
 * Templates use {{variable}} placeholders that are replaced with HTML-escaped values at render time.
 */
@Service
public class EmailTemplateService {

    private final EmailTemplateRepository repository;

    // Available variables per template type, shown to admins as documentation
    private static final Map<EmailTemplateType, List<String>> AVAILABLE_VARIABLES = new EnumMap<>(EmailTemplateType.class);

    // Default subjects per template type (also support {{variable}} placeholders)
    private static final Map<EmailTemplateType, String> DEFAULT_SUBJECTS = new EnumMap<>(EmailTemplateType.class);

    // Default body templates using {{variable}} placeholders
    private static final Map<EmailTemplateType, String> DEFAULT_BODIES = new EnumMap<>(EmailTemplateType.class);

    static {
        AVAILABLE_VARIABLES.put(EmailTemplateType.SUBMITTED, List.of(
                "contactName", "confirmationNumber", "eventTitle", "eventDate",
                "startTime", "endTime", "location", "expectedGuests", "barName"));

        AVAILABLE_VARIABLES.put(EmailTemplateType.STATUS_CHANGED, List.of(
                "contactName", "confirmationNumber", "eventTitle", "eventDate",
                "startTime", "endTime", "location", "expectedGuests",
                "status", "statusMessage", "statusColor", "barName", "staffEmail"));

        AVAILABLE_VARIABLES.put(EmailTemplateType.UPDATED, List.of(
                "contactName", "confirmationNumber", "eventTitle", "eventDate",
                "startTime", "endTime", "location", "expectedGuests", "status", "barName"));

        AVAILABLE_VARIABLES.put(EmailTemplateType.CANCELLED, List.of(
                "contactName", "eventTitle", "confirmationNumber", "staffEmail", "barName"));

        AVAILABLE_VARIABLES.put(EmailTemplateType.STAFF_NOTIFICATION, List.of(
                "confirmationNumber", "contactName", "email", "phone", "organization",
                "eventTitle", "eventType", "organizerType", "eventDate", "startTime",
                "endTime", "location", "expectedGuests", "payment",
                "dietaryInfo", "description", "comments"));

        DEFAULT_SUBJECTS.put(EmailTemplateType.SUBMITTED,
                "Reservation Request Received - {{eventTitle}}");
        DEFAULT_SUBJECTS.put(EmailTemplateType.STATUS_CHANGED,
                "{{statusSubject}} - {{eventTitle}}");
        DEFAULT_SUBJECTS.put(EmailTemplateType.UPDATED,
                "Reservation Updated - {{eventTitle}}");
        DEFAULT_SUBJECTS.put(EmailTemplateType.CANCELLED,
                "Reservation Cancelled - {{eventTitle}}");
        DEFAULT_SUBJECTS.put(EmailTemplateType.STAFF_NOTIFICATION,
                "[New Reservation] {{eventTitle}} - {{contactName}}");

        DEFAULT_BODIES.put(EmailTemplateType.SUBMITTED, """
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9f9f9; }
                        .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
                        .confirmation-number { font-size: 24px; font-weight: bold; color: #4CAF50; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header"><h1>Reservation Request Received</h1></div>
                        <div class="content">
                            <p>Dear {{contactName}},</p>
                            <p>Thank you for reaching out to us. Please consider that reservations made less than 72 hours in advance cannot always be confirmed or denied in time. If you don't receive a confirmation, you are still welcome to visit us if capacity allows!</p>
                            <p>This is not a confirmation, your reservation still awaits approval! Please note that we generally do not reply within 72 hours.</p>
                            <div class="details">
                                <p><strong>Confirmation Number:</strong> <span class="confirmation-number">{{confirmationNumber}}</span></p>
                                <p><strong>Event:</strong> {{eventTitle}}</p>
                                <p><strong>Date:</strong> {{eventDate}}</p>
                                <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
                                <p><strong>Location:</strong> {{location}}</p>
                                <p><strong>Expected Guests:</strong> {{expectedGuests}}</p>
                                <p><strong>Status:</strong> <em>Pending Review</em></p>
                            </div>
                            <p>If you have any questions, please don't hesitate to contact us.</p>
                            <p>Best regards,<br>{{barName}}</p>
                        </div>
                    </div>
                </body>
                </html>
                """);

        DEFAULT_BODIES.put(EmailTemplateType.STATUS_CHANGED, """
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: {{statusColor}}; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9f9f9; }
                        .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid {{statusColor}}; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header"><h1>Reservation {{status}}</h1></div>
                        <div class="content">
                            <p>Dear {{contactName}},</p>
                            <p>{{statusMessage}}</p>
                            <div class="details">
                                <p><strong>Confirmation Number:</strong> {{confirmationNumber}}</p>
                                <p><strong>Event:</strong> {{eventTitle}}</p>
                                <p><strong>Date:</strong> {{eventDate}}</p>
                                <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
                                <p><strong>Location:</strong> {{location}}</p>
                                <p><strong>Guests:</strong> {{expectedGuests}}</p>
                                <p><strong>Status:</strong> {{status}}</p>
                            </div>
                            <p>Best regards,<br>{{barName}}</p>
                        </div>
                    </div>
                </body>
                </html>
                """);

        DEFAULT_BODIES.put(EmailTemplateType.UPDATED, """
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9f9f9; }
                        .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #FF9800; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header"><h1>Reservation Updated</h1></div>
                        <div class="content">
                            <p>Dear {{contactName}},</p>
                            <p>Your reservation has been updated. Please review the details below:</p>
                            <div class="details">
                                <p><strong>Confirmation Number:</strong> {{confirmationNumber}}</p>
                                <p><strong>Event:</strong> {{eventTitle}}</p>
                                <p><strong>Date:</strong> {{eventDate}}</p>
                                <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
                                <p><strong>Location:</strong> {{location}}</p>
                                <p><strong>Guests:</strong> {{expectedGuests}}</p>
                                <p><strong>Status:</strong> {{status}}</p>
                            </div>
                            <p>If you did not request this change or have any questions, please contact us immediately.</p>
                            <p>Best regards,<br>{{barName}}</p>
                        </div>
                    </div>
                </body>
                </html>
                """);

        DEFAULT_BODIES.put(EmailTemplateType.CANCELLED, """
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9f9f9; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header"><h1>Reservation Cancelled</h1></div>
                        <div class="content">
                            <p>Dear {{contactName}},</p>
                            <p>Your reservation <strong>{{eventTitle}}</strong> (Confirmation #{{confirmationNumber}}) has been cancelled.</p>
                            <p>We hope to see you again in the future! If you'd like to make a new reservation, please visit our website.</p>
                            <p>If you have any questions, please contact us at {{staffEmail}}.</p>
                            <p>Best regards,<br>{{barName}}</p>
                        </div>
                        <div class="footer"><p>This is an automated message. Please do not reply to this email.</p></div>
                    </div>
                </body>
                </html>
                """);

        DEFAULT_BODIES.put(EmailTemplateType.STAFF_NOTIFICATION, """
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9f9f9; }
                        .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2196F3; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header"><h1>New Reservation Request</h1></div>
                        <div class="content">
                            <p>A new reservation has been submitted and requires review:</p>
                            <div class="details">
                                <p><strong>Reservation Number:</strong> {{confirmationNumber}}</p>
                                <p><strong>Contact:</strong> {{contactName}}</p>
                                <p><strong>Email:</strong> {{email}}</p>
                                <p><strong>Phone:</strong> {{phone}}</p>
                                <p><strong>Organization:</strong> {{organization}}</p>
                                <hr>
                                <p><strong>Event:</strong> {{eventTitle}}</p>
                                <p><strong>Type:</strong> {{eventType}} ({{organizerType}})</p>
                                <p><strong>Date:</strong> {{eventDate}}</p>
                                <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
                                <p><strong>Location:</strong> {{location}}</p>
                                <p><strong>Guests:</strong> {{expectedGuests}}</p>
                                <p><strong>Payment:</strong> {{payment}}</p>
                                <p><strong>Food:</strong> {{dietaryInfo}}</p>
                                <p><strong>Description:</strong> {{description}}</p>
                                <p><strong>Comments:</strong> {{comments}}</p>
                            </div>
                            <p>Please review and respond to the customer as soon as possible.</p>
                        </div>
                    </div>
                </body>
                </html>
                """);
    }

    public EmailTemplateService(EmailTemplateRepository repository) {
        this.repository = repository;
    }

    /**
     * Render a template body, using the DB override if present, otherwise the hardcoded default.
     * All variable values are HTML-escaped before substitution to prevent XSS.
     */
    public String getRenderedBody(EmailTemplateType type, Map<String, String> variables) {
        String template = repository.findByTemplateType(type)
                .map(EmailTemplate::getBodyTemplate)
                .orElse(DEFAULT_BODIES.get(type));
        return render(template, variables);
    }

    /**
     * Render a template subject, using the DB override if present, otherwise the hardcoded default.
     */
    public String getRenderedSubject(EmailTemplateType type, Map<String, String> variables) {
        String template = repository.findByTemplateType(type)
                .map(EmailTemplate::getSubject)
                .orElse(DEFAULT_SUBJECTS.get(type));
        return render(template, variables);
    }

    public List<EmailTemplateDto> findAll() {
        return Arrays.stream(EmailTemplateType.values())
                .map(this::toDto)
                .toList();
    }

    public Optional<EmailTemplateDto> findByType(EmailTemplateType type) {
        return Optional.of(toDto(type));
    }

    public EmailTemplateDto update(EmailTemplateType type, String subject, String bodyTemplate) {
        EmailTemplate template = repository.findByTemplateType(type)
                .orElse(EmailTemplate.builder().templateType(type).build());
        template.setSubject(subject);
        template.setBodyTemplate(bodyTemplate);
        repository.save(template);
        return toDto(type);
    }

    public void reset(EmailTemplateType type) {
        repository.findByTemplateType(type).ifPresent(repository::delete);
    }

    public List<String> getAvailableVariables(EmailTemplateType type) {
        return AVAILABLE_VARIABLES.getOrDefault(type, List.of());
    }

    /**
     * Returns realistic sample variable values for the given template type.
     * Used when sending test emails so admins can preview the rendered output.
     */
    public Map<String, String> buildSampleVariables(EmailTemplateType type) {
        Map<String, String> vars = new java.util.HashMap<>();
        // Common fields
        vars.put("contactName", "Jane Doe");
        vars.put("confirmationNumber", "TEST01");
        vars.put("eventTitle", "Test Event — Template Preview");
        vars.put("eventDate", "Friday, April 4, 2026");
        vars.put("startTime", "18:00");
        vars.put("endTime", "22:00");
        vars.put("location", "Hubble Community Café");
        vars.put("expectedGuests", "40");
        vars.put("barName", "Hubble and Meteor Community Cafes");
        vars.put("staffEmail", "events@hubble.cafe");
        vars.put("status", "Confirmed");

        if (type == EmailTemplateType.STATUS_CHANGED) {
            vars.put("statusColor", "#4CAF50");
            vars.put("statusMessage", "We're pleased to confirm your reservation!");
            vars.put("statusSubject", "Reservation Confirmed");
        }
        if (type == EmailTemplateType.STAFF_NOTIFICATION) {
            vars.put("email", "jane.doe@example.com");
            vars.put("phone", "+31 6 12345678");
            vars.put("organization", "Example Association");
            vars.put("eventType", "Borrel");
            vars.put("organizerType", "Association");
            vars.put("payment", "Individual");
            vars.put("dietaryInfo", "Yes (Dietary: Vegetarian)");
            vars.put("description", "Our annual drinks event for members and guests.");
            vars.put("comments", "Please ensure outdoor seating is available.");
        }
        return vars;
    }

    /** Render an arbitrary template string with the given variables (used for test previews). */
    public String renderForTest(String template, Map<String, String> variables) {
        return render(template, variables);
    }

    public String getDefaultBody(EmailTemplateType type) {
        return DEFAULT_BODIES.get(type);
    }

    public String getDefaultSubject(EmailTemplateType type) {
        return DEFAULT_SUBJECTS.get(type);
    }

    private EmailTemplateDto toDto(EmailTemplateType type) {
        Optional<EmailTemplate> stored = repository.findByTemplateType(type);
        return EmailTemplateDto.builder()
                .templateType(type)
                .displayName(type.getDisplayName())
                .description(type.getDescription())
                .subject(stored.map(EmailTemplate::getSubject).orElse(DEFAULT_SUBJECTS.get(type)))
                .bodyTemplate(stored.map(EmailTemplate::getBodyTemplate).orElse(DEFAULT_BODIES.get(type)))
                .customized(stored.isPresent())
                .updatedAt(stored.map(EmailTemplate::getUpdatedAt).orElse(null))
                .availableVariables(AVAILABLE_VARIABLES.getOrDefault(type, List.of()))
                .build();
    }

    private String render(String template, Map<String, String> variables) {
        if (template == null) return "";
        String result = template;
        for (Map.Entry<String, String> entry : variables.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}", escapeHtml(entry.getValue()));
        }
        return result;
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }
}
