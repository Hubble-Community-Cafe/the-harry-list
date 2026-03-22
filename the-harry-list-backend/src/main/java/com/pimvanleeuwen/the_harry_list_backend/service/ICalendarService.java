package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.model.SpecialActivity;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service for generating iCal/ICS calendar feeds.
 */
@Service
public class ICalendarService {

    private static final String TIMEZONE = "Europe/Amsterdam";
    private static final DateTimeFormatter ICS_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss");

    private final ReservationRepository reservationRepository;

    public ICalendarService(ReservationRepository reservationRepository) {
        this.reservationRepository = reservationRepository;
    }

    public String generateCalendarFeed(List<ReservationStatus> includeStatuses, String location, boolean includeConfidentialDetails) {
        List<Reservation> reservations = reservationRepository.findAll();

        if (includeStatuses != null && !includeStatuses.isEmpty()) {
            reservations = reservations.stream()
                    .filter(r -> includeStatuses.contains(r.getStatus()))
                    .toList();
        }

        if (location != null && !location.isEmpty()) {
            reservations = reservations.stream()
                    .filter(r -> r.getLocation() != null && r.getLocation().name().equalsIgnoreCase(location))
                    .toList();
        }

        return buildIcsCalendar(reservations, includeConfidentialDetails);
    }

    public String generateUpcomingCalendarFeed(List<ReservationStatus> includeStatuses, String location, boolean includeConfidentialDetails) {
        LocalDate today = LocalDate.now();
        List<Reservation> reservations = reservationRepository.findAll().stream()
                .filter(r -> r.getEventDate() != null && !r.getEventDate().isBefore(today))
                .toList();

        if (includeStatuses != null && !includeStatuses.isEmpty()) {
            reservations = reservations.stream()
                    .filter(r -> includeStatuses.contains(r.getStatus()))
                    .toList();
        }

        if (location != null && !location.isEmpty()) {
            reservations = reservations.stream()
                    .filter(r -> r.getLocation() != null && r.getLocation().name().equalsIgnoreCase(location))
                    .toList();
        }

        return buildIcsCalendar(reservations, includeConfidentialDetails);
    }

    private String buildIcsCalendar(List<Reservation> reservations, boolean includeConfidentialDetails) {
        StringBuilder ics = new StringBuilder();

        String calendarName = includeConfidentialDetails
                ? "The Harry List - Staff Reservations"
                : "The Harry List - Reservations";

        ics.append("BEGIN:VCALENDAR\r\n");
        ics.append("VERSION:2.0\r\n");
        ics.append("PRODID:-//The Harry List//Reservation System//EN\r\n");
        ics.append("CALSCALE:GREGORIAN\r\n");
        ics.append("METHOD:PUBLISH\r\n");
        ics.append("X-WR-CALNAME:").append(calendarName).append("\r\n");
        ics.append("X-WR-TIMEZONE:").append(TIMEZONE).append("\r\n");
        ics.append("REFRESH-INTERVAL;VALUE=DURATION:PT15M\r\n");
        ics.append("X-PUBLISHED-TTL:PT15M\r\n");
        ics.append(getTimezoneDefinition());

        for (Reservation reservation : reservations) {
            ics.append(buildEvent(reservation, includeConfidentialDetails));
        }

        ics.append("END:VCALENDAR\r\n");

        return ics.toString();
    }

    private String buildEvent(Reservation reservation, boolean includeConfidentialDetails) {
        StringBuilder event = new StringBuilder();

        event.append("BEGIN:VEVENT\r\n");

        String uid = "reservation-" + reservation.getId() + "@harrylist.hubble.cafe";
        event.append("UID:").append(uid).append("\r\n");

        LocalDateTime now = LocalDateTime.now();
        event.append("DTSTAMP:").append(now.format(ICS_DATE_FORMAT)).append("\r\n");

        if (reservation.getCreatedAt() != null) {
            event.append("CREATED:").append(reservation.getCreatedAt().format(ICS_DATE_FORMAT)).append("\r\n");
        }
        if (reservation.getUpdatedAt() != null) {
            event.append("LAST-MODIFIED:").append(reservation.getUpdatedAt().format(ICS_DATE_FORMAT)).append("\r\n");
        }

        LocalDate eventDate = reservation.getEventDate();
        LocalTime startTime = reservation.getStartTime();
        LocalTime endTime = reservation.getEndTime();

        if (eventDate != null && startTime != null) {
            LocalDateTime startDateTime = LocalDateTime.of(eventDate, startTime);
            event.append("DTSTART;TZID=").append(TIMEZONE).append(":").append(startDateTime.format(ICS_DATE_FORMAT)).append("\r\n");

            if (endTime != null) {
                LocalDateTime endDateTime = LocalDateTime.of(eventDate, endTime);
                if (endTime.isBefore(startTime)) {
                    endDateTime = endDateTime.plusDays(1);
                }
                event.append("DTEND;TZID=").append(TIMEZONE).append(":").append(endDateTime.format(ICS_DATE_FORMAT)).append("\r\n");
            }
        }

        // Title: "Event Title! Pax: XX [STATUS]"
        String title = String.format("%s! Pax: %d [%s]",
                escapeIcsText(reservation.getEventTitle()),
                reservation.getExpectedGuests() != null ? reservation.getExpectedGuests() : 0,
                reservation.getStatus() != null ? reservation.getStatus().name() : "PENDING");
        event.append("SUMMARY:").append(title).append("\r\n");

        String location = formatLocation(reservation);
        if (!location.isEmpty()) {
            event.append("LOCATION:").append(escapeIcsText(location)).append("\r\n");
        }

        String description = includeConfidentialDetails
                ? buildStaffDescription(reservation)
                : buildPublicDescription(reservation);
        event.append("DESCRIPTION:").append(escapeIcsText(description)).append("\r\n");

        String status = switch (reservation.getStatus()) {
            case CONFIRMED -> "CONFIRMED";
            case CANCELLED, REJECTED -> "CANCELLED";
            default -> "TENTATIVE";
        };
        event.append("STATUS:").append(status).append("\r\n");

        if (reservation.getLocation() != null) {
            event.append("CATEGORIES:").append(reservation.getLocation().getDisplayName()).append("\r\n");
        }

        event.append("END:VEVENT\r\n");

        return event.toString();
    }

    private String formatLocation(Reservation reservation) {
        StringBuilder sb = new StringBuilder();

        if (reservation.getLocation() != null) {
            sb.append(reservation.getLocation().getDisplayName());
        }

        if (reservation.getSeatingArea() != null) {
            sb.append(" ").append(reservation.getSeatingArea().getDisplayName());
        }

        return sb.toString().trim();
    }

    private String buildStaffDescription(Reservation reservation) {
        StringBuilder sb = new StringBuilder();

        if (reservation.getDescription() != null && !reservation.getDescription().isEmpty()) {
            sb.append(reservation.getDescription()).append("\n\n");
        }

        sb.append("Personal Details:\n");
        sb.append("Name: ").append(reservation.getContactName()).append("\n");
        if (reservation.getOrganizationName() != null && !reservation.getOrganizationName().isEmpty()) {
            sb.append("Organization: ").append(reservation.getOrganizationName()).append("\n");
        }

        sb.append("\nEvent Details:\n");
        if (reservation.getEventDate() != null) {
            sb.append("Date: ").append(reservation.getEventDate()).append("\n");
        }
        if (reservation.getStartTime() != null && reservation.getEndTime() != null) {
            sb.append("Time: ").append(reservation.getStartTime()).append(" - ").append(reservation.getEndTime()).append("\n");
        }
        sb.append("Title: ").append(reservation.getEventTitle()).append("\n");
        sb.append("Pax: ").append(reservation.getExpectedGuests()).append("\n");
        sb.append("Location: ").append(formatLocation(reservation)).append("\n");

        // Special activities
        Set<SpecialActivity> activities = reservation.getSpecialActivities();
        if (activities != null && !activities.isEmpty()) {
            String activitiesStr = activities.stream()
                    .map(SpecialActivity::getDisplayName)
                    .collect(Collectors.joining(", "));
            sb.append("Activities: ").append(activitiesStr).append("\n");
        }

        if (reservation.getPaymentOption() != null) {
            sb.append("\nPayment: ").append(reservation.getPaymentOption().getDisplayName()).append("\n");
        }
        if (reservation.getInvoiceType() != null) {
            sb.append("Invoice Type: ").append(reservation.getInvoiceType().getDisplayName()).append("\n");
        }
        if (reservation.getCostCenter() != null && !reservation.getCostCenter().isEmpty()) {
            sb.append("Kostenplaats: ").append(reservation.getCostCenter()).append("\n");
        }
        if (reservation.getInvoiceName() != null && !reservation.getInvoiceName().isEmpty()) {
            sb.append("Invoice Name: ").append(reservation.getInvoiceName()).append("\n");
        }
        if (reservation.getInvoiceAddress() != null && !reservation.getInvoiceAddress().isEmpty()) {
            sb.append("Invoice Address: ").append(reservation.getInvoiceAddress()).append("\n");
        }

        // Catering
        boolean hasCateringActivity = activities != null && activities.stream()
                .anyMatch(a -> a == SpecialActivity.EAT_A_LA_CARTE || a == SpecialActivity.EAT_CATERING || a == SpecialActivity.CATERING_CORONA_ROOM);
        if (hasCateringActivity) {
            sb.append("\nCatering Arranged: ").append(reservation.isCateringArranged() ? "Yes ✓" : "Not yet").append("\n");
        }
        if (reservation.getCateringDietaryNotes() != null && !reservation.getCateringDietaryNotes().isEmpty()) {
            sb.append("Catering Dietary Notes: ").append(reservation.getCateringDietaryNotes()).append("\n");
        }

        if (reservation.getLongReservationReason() != null && !reservation.getLongReservationReason().isEmpty()) {
            sb.append("\nLong Reservation Reason: ").append(reservation.getLongReservationReason()).append("\n");
        }

        if (reservation.getComments() != null && !reservation.getComments().isEmpty()) {
            sb.append("\nComments: ").append(reservation.getComments()).append("\n");
        }

        if (reservation.getInternalNotes() != null && !reservation.getInternalNotes().isEmpty()) {
            sb.append("\n⚠ Internal Notes: ").append(reservation.getInternalNotes()).append("\n");
        }

        sb.append("\n─────────────────────────────\n");
        sb.append("Confidential Details:\n");
        sb.append("Email: ").append(reservation.getEmail()).append("\n");
        if (reservation.getPhoneNumber() != null && !reservation.getPhoneNumber().isEmpty()) {
            sb.append("Phone: ").append(reservation.getPhoneNumber()).append("\n");
        }

        sb.append("\n─────────────────────────────\n");
        sb.append("Status: ").append(reservation.getStatus()).append("\n");
        if (reservation.getConfirmationNumber() != null) {
            sb.append("Ref: ").append(reservation.getConfirmationNumber()).append("\n");
        }
        if (reservation.getConfirmedBy() != null && !reservation.getConfirmedBy().isEmpty()) {
            sb.append("Confirmed by: ").append(reservation.getConfirmedBy()).append("\n");
        }

        return sb.toString();
    }

    private String buildPublicDescription(Reservation reservation) {
        StringBuilder sb = new StringBuilder();

        if (reservation.getDescription() != null && !reservation.getDescription().isEmpty()) {
            sb.append(reservation.getDescription()).append("\n\n");
        }

        sb.append("Contact: ").append(reservation.getContactName()).append("\n");
        if (reservation.getOrganizationName() != null && !reservation.getOrganizationName().isEmpty()) {
            sb.append("Organization: ").append(reservation.getOrganizationName()).append("\n");
        }

        sb.append("\nEvent Details:\n");
        if (reservation.getEventDate() != null) {
            sb.append("Date: ").append(reservation.getEventDate()).append("\n");
        }
        if (reservation.getStartTime() != null && reservation.getEndTime() != null) {
            sb.append("Time: ").append(reservation.getStartTime()).append(" - ").append(reservation.getEndTime()).append("\n");
        }
        sb.append("Pax: ").append(reservation.getExpectedGuests()).append("\n");
        sb.append("Location: ").append(formatLocation(reservation)).append("\n");

        Set<SpecialActivity> activities = reservation.getSpecialActivities();
        if (activities != null && !activities.isEmpty()) {
            String activitiesStr = activities.stream()
                    .map(SpecialActivity::getDisplayName)
                    .collect(Collectors.joining(", "));
            sb.append("Activities: ").append(activitiesStr).append("\n");
        }

        if (reservation.getPaymentOption() != null) {
            sb.append("\nPayment: ").append(reservation.getPaymentOption().getDisplayName()).append("\n");
        }

        if (reservation.getComments() != null && !reservation.getComments().isEmpty()) {
            sb.append("\nComments: ").append(reservation.getComments()).append("\n");
        }

        sb.append("\n---\n");
        sb.append("Status: ").append(reservation.getStatus()).append("\n");
        if (reservation.getConfirmationNumber() != null) {
            sb.append("Ref: ").append(reservation.getConfirmationNumber()).append("\n");
        }

        sb.append("\n(Contact details available in admin portal)");

        return sb.toString();
    }

    private String escapeIcsText(String text) {
        if (text == null) return "";
        return text
                .replace("\\", "\\\\")
                .replace(",", "\\,")
                .replace(";", "\\;")
                .replace("\r\n", "\n")
                .replace("\r", "\n")
                .replace("\n", "\\n");
    }

    private String getTimezoneDefinition() {
        return "BEGIN:VTIMEZONE\r\n" +
                "TZID:Europe/Amsterdam\r\n" +
                "X-LIC-LOCATION:Europe/Amsterdam\r\n" +
                "BEGIN:DAYLIGHT\r\n" +
                "TZOFFSETFROM:+0100\r\n" +
                "TZOFFSETTO:+0200\r\n" +
                "TZNAME:CEST\r\n" +
                "DTSTART:19700329T020000\r\n" +
                "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\n" +
                "END:DAYLIGHT\r\n" +
                "BEGIN:STANDARD\r\n" +
                "TZOFFSETFROM:+0200\r\n" +
                "TZOFFSETTO:+0100\r\n" +
                "TZNAME:CET\r\n" +
                "DTSTART:19701025T030000\r\n" +
                "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\n" +
                "END:STANDARD\r\n" +
                "END:VTIMEZONE\r\n";
    }
}
