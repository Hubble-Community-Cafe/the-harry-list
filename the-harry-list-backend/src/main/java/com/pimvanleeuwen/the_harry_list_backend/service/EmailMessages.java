package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.config.properties.AppMailProperties;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailTemplateType;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.model.SpecialActivity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Builds every reservation email: the template variables, subject and body, recipient and
 * Reply-To. This is the one place that knows what goes into a message; delivery is up to a
 * {@link MailTransport}.
 */
@Component
public class EmailMessages {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final EmailTemplateService templates;
    private final String staffEmail;
    private final String barName;

    public EmailMessages(EmailTemplateService templates, AppMailProperties mail,
                         @Value("${app.bar.name:Hubble and Meteor Community Cafes}") String barName) {
        this.templates = templates;
        this.staffEmail = mail.staff();
        this.barName = barName;
    }

    /** The staff inbox: guest replies go here, and it receives new-reservation alerts. */
    public String staffEmail() {
        return staffEmail;
    }

    public OutgoingEmail submitted(Reservation reservation) {
        return toGuest(reservation, EmailTemplateType.SUBMITTED, baseVars(reservation), null);
    }

    public OutgoingEmail staffNotification(Reservation reservation) {
        Map<String, String> vars = staffNotificationVars(reservation);
        return new OutgoingEmail(staffEmail,
                templates.getRenderedSubject(EmailTemplateType.STAFF_NOTIFICATION, vars),
                templates.getRenderedBody(EmailTemplateType.STAFF_NOTIFICATION, vars),
                staffEmail);
    }

    public OutgoingEmail statusChanged(Reservation reservation, String customMessage) {
        Map<String, String> vars = baseVars(reservation);
        vars.put("staffEmail", staffEmail);
        vars.put("status", reservation.getStatus().getDisplayName());
        vars.put("statusMessage", statusMessage(reservation.getStatus()));
        vars.put("statusColor", statusColor(reservation.getStatus()));
        vars.put("statusSubject", statusSubject(reservation.getStatus()));
        return toGuest(reservation, EmailTemplateType.STATUS_CHANGED, vars, customMessage);
    }

    public OutgoingEmail updated(Reservation reservation, String customMessage) {
        Map<String, String> vars = baseVars(reservation);
        vars.put("status", reservation.getStatus().getDisplayName());
        return toGuest(reservation, EmailTemplateType.UPDATED, vars, customMessage);
    }

    public OutgoingEmail cancelled(Reservation reservation) {
        Map<String, String> vars = baseVars(reservation);
        vars.put("staffEmail", staffEmail);
        return toGuest(reservation, EmailTemplateType.CANCELLED, vars, null);
    }

    public OutgoingEmail custom(Reservation reservation, String subject, String message) {
        return new OutgoingEmail(reservation.getEmail(), subject,
                EmailTemplates.buildCustomEmailBody(reservation, message, barName, staffEmail), staffEmail);
    }

    /** Variables for the editable catering-options template (preview and send). */
    public Map<String, String> cateringVars(Reservation reservation) {
        Map<String, String> vars = baseVars(reservation);
        vars.put("staffEmail", staffEmail);
        return vars;
    }

    /**
     * A guest email from an editable template. {@code customMessage} is only used by the
     * templates that have a staff-note block (status change and update).
     */
    private OutgoingEmail toGuest(Reservation reservation, EmailTemplateType type,
                                  Map<String, String> vars, String customMessage) {
        String body = (type == EmailTemplateType.STATUS_CHANGED || type == EmailTemplateType.UPDATED)
                ? templates.getRenderedBody(type, vars,
                        Map.of("customMessage", EmailTemplates.buildCustomMessageBlock(customMessage)))
                : templates.getRenderedBody(type, vars);
        return new OutgoingEmail(reservation.getEmail(), templates.getRenderedSubject(type, vars), body, staffEmail);
    }

    private Map<String, String> baseVars(Reservation reservation) {
        Map<String, String> vars = new HashMap<>();
        vars.put("contactName", reservation.getContactName());
        vars.put("confirmationNumber", reservation.getConfirmationNumber());
        vars.put("eventTitle", reservation.getEventTitle());
        vars.put("eventDate", reservation.getEventDate().format(DATE_FORMATTER));
        vars.put("startTime", reservation.getStartTime().format(TIME_FORMATTER));
        vars.put("endTime", reservation.getEndTime().format(TIME_FORMATTER));
        vars.put("location", reservation.getLocation() != null ? reservation.getLocation().getDisplayName() : "No preference");
        vars.put("expectedGuests", String.valueOf(reservation.getExpectedGuests()));
        vars.put("barName", barName);
        return vars;
    }

    private Map<String, String> staffNotificationVars(Reservation reservation) {
        Map<String, String> vars = new HashMap<>();
        vars.put("confirmationNumber", reservation.getConfirmationNumber());
        vars.put("contactName", reservation.getContactName());
        vars.put("email", reservation.getEmail());
        vars.put("phone", orDefault(reservation.getPhoneNumber(), "Not provided"));
        vars.put("organization", orDefault(reservation.getOrganizationName(), "Not provided"));
        vars.put("eventTitle", reservation.getEventTitle());
        vars.put("eventDate", reservation.getEventDate().format(DATE_FORMATTER));
        vars.put("startTime", reservation.getStartTime().format(TIME_FORMATTER));
        vars.put("endTime", reservation.getEndTime().format(TIME_FORMATTER));
        vars.put("location", reservation.getLocation() != null ? reservation.getLocation().getDisplayName() : "No preference");
        vars.put("expectedGuests", String.valueOf(reservation.getExpectedGuests()));
        vars.put("payment", reservation.getPaymentOption() != null
                ? reservation.getPaymentOption().getDisplayName() : "Not provided");

        Set<SpecialActivity> activities = reservation.getSpecialActivities();
        vars.put("specialActivities", activities != null && !activities.isEmpty()
                ? activities.stream().map(SpecialActivity::getDisplayName).collect(Collectors.joining(", "))
                : "None");
        vars.put("description", orDefault(reservation.getDescription(), ""));
        vars.put("comments", orDefault(reservation.getComments(), ""));
        return vars;
    }

    private static String orDefault(String value, String fallback) {
        return value != null ? value : fallback;
    }

    private static String statusMessage(ReservationStatus status) {
        return switch (status) {
            case CONFIRMED -> "We're pleased to confirm your reservation!";
            case REJECTED -> "Unfortunately, we're unable to accommodate your reservation request at this time.";
            case CANCELLED -> "Your reservation has been cancelled as requested.";
            default -> "Your reservation status has been updated.";
        };
    }

    private static String statusColor(ReservationStatus status) {
        return switch (status) {
            case CONFIRMED -> "#4CAF50";
            case REJECTED, CANCELLED -> "#f44336";
            default -> "#FF9800";
        };
    }

    private static String statusSubject(ReservationStatus status) {
        return switch (status) {
            case CONFIRMED -> "Reservation Confirmed";
            case REJECTED -> "Reservation Request Update";
            case CANCELLED -> "Reservation Cancelled";
            default -> "Reservation Update";
        };
    }
}
