package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.CalendarAppointment;
import com.pimvanleeuwen.the_harry_list_backend.model.RecurrenceType;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.model.SpecialActivity;
import com.pimvanleeuwen.the_harry_list_backend.repository.CalendarAppointmentRepository;
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
    private static final DateTimeFormatter ICS_DATE_ONLY_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final ReservationRepository reservationRepository;
    private final CalendarAppointmentRepository calendarAppointmentRepository;

    public ICalendarService(ReservationRepository reservationRepository,
                            CalendarAppointmentRepository calendarAppointmentRepository) {
        this.reservationRepository = reservationRepository;
        this.calendarAppointmentRepository = calendarAppointmentRepository;
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

        List<CalendarAppointment> appointments = getFilteredAppointments(location);

        return buildIcsCalendar(reservations, appointments, includeConfidentialDetails);
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

        List<CalendarAppointment> appointments = getFilteredAppointments(location).stream()
                .filter(a -> {
                    if (a.getRecurrenceType() != RecurrenceType.NONE) {
                        // Recurring: include if no end date or end date is in the future
                        return a.getRecurrenceEndDate() == null || !a.getRecurrenceEndDate().isBefore(today);
                    }
                    // Non-recurring: include if date is today or in the future
                    return !a.getDate().isBefore(today);
                })
                .toList();

        return buildIcsCalendar(reservations, appointments, includeConfidentialDetails);
    }

    private List<CalendarAppointment> getFilteredAppointments(String location) {
        List<CalendarAppointment> appointments = calendarAppointmentRepository.findByEnabledTrue();

        if (location != null && !location.isEmpty()) {
            appointments = appointments.stream()
                    .filter(a -> a.getLocation() != null && a.getLocation().name().equalsIgnoreCase(location))
                    .toList();
        }

        return appointments;
    }

    private String buildIcsCalendar(List<Reservation> reservations, List<CalendarAppointment> appointments,
                                    boolean includeConfidentialDetails) {
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

        for (CalendarAppointment appointment : appointments) {
            ics.append(buildAppointmentEvent(appointment));
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

    private String buildAppointmentEvent(CalendarAppointment appointment) {
        StringBuilder event = new StringBuilder();

        event.append("BEGIN:VEVENT\r\n");

        String uid = "appointment-" + appointment.getId() + "@harrylist.hubble.cafe";
        event.append("UID:").append(uid).append("\r\n");

        LocalDateTime now = LocalDateTime.now();
        event.append("DTSTAMP:").append(now.format(ICS_DATE_FORMAT)).append("\r\n");

        if (appointment.getCreatedAt() != null) {
            event.append("CREATED:").append(appointment.getCreatedAt().format(ICS_DATE_FORMAT)).append("\r\n");
        }
        if (appointment.getUpdatedAt() != null) {
            event.append("LAST-MODIFIED:").append(appointment.getUpdatedAt().format(ICS_DATE_FORMAT)).append("\r\n");
        }

        if (Boolean.TRUE.equals(appointment.getAllDay())) {
            // All-day event: DATE only (no time), DTEND is next day per ICS spec
            event.append("DTSTART;VALUE=DATE:").append(appointment.getDate().format(ICS_DATE_ONLY_FORMAT)).append("\r\n");
            event.append("DTEND;VALUE=DATE:").append(appointment.getDate().plusDays(1).format(ICS_DATE_ONLY_FORMAT)).append("\r\n");
        } else {
            // Timeboxed event
            if (appointment.getStartTime() != null) {
                LocalDateTime startDateTime = LocalDateTime.of(appointment.getDate(), appointment.getStartTime());
                event.append("DTSTART;TZID=").append(TIMEZONE).append(":").append(startDateTime.format(ICS_DATE_FORMAT)).append("\r\n");

                if (appointment.getEndTime() != null) {
                    LocalDateTime endDateTime = LocalDateTime.of(appointment.getDate(), appointment.getEndTime());
                    if (appointment.getEndTime().isBefore(appointment.getStartTime())) {
                        endDateTime = endDateTime.plusDays(1);
                    }
                    event.append("DTEND;TZID=").append(TIMEZONE).append(":").append(endDateTime.format(ICS_DATE_FORMAT)).append("\r\n");
                }
            }
        }

        event.append("SUMMARY:").append(escapeIcsText(appointment.getTitle())).append("\r\n");

        if (appointment.getLocation() != null) {
            event.append("LOCATION:").append(escapeIcsText(appointment.getLocation().getDisplayName())).append("\r\n");
        }

        if (appointment.getDescription() != null && !appointment.getDescription().isEmpty()) {
            event.append("DESCRIPTION:").append(escapeIcsText(appointment.getDescription())).append("\r\n");
        }

        event.append("STATUS:CONFIRMED\r\n");

        if (appointment.getLocation() != null) {
            event.append("CATEGORIES:").append(appointment.getLocation().getDisplayName()).append(",Appointment\r\n");
        }

        String rrule = buildRecurrenceRule(appointment);
        if (!rrule.isEmpty()) {
            event.append(rrule);
        }

        event.append("END:VEVENT\r\n");

        return event.toString();
    }

    /**
     * Builds the RFC 5545 RRULE line for an appointment's recurrence.
     *
     * <p>This is the single mapping from our structured recurrence model to iCal.
     * Frequency comes from {@link RecurrenceType}; "every N" from
     * {@code recurrenceInterval}; and the nth-weekday detail from
     * {@code recurrenceWeekOfMonth} + {@code recurrenceDayOfWeek}. New recurrence
     * patterns should be expressed here rather than scattered across the codebase.
     */
    private String buildRecurrenceRule(CalendarAppointment appointment) {
        RecurrenceType type = appointment.getRecurrenceType();
        if (type == null || type == RecurrenceType.NONE) {
            return "";
        }

        String freq;
        String byDay = null;
        int interval = effectiveInterval(appointment);

        switch (type) {
            case DAILY -> freq = "DAILY";
            case WEEKLY -> freq = "WEEKLY";
            case MONTHLY -> freq = "MONTHLY";
            case YEARLY -> freq = "YEARLY";
            case MONTHLY_NTH_WEEKDAY -> {
                byDay = formatNthWeekday(appointment);
                if (byDay == null) {
                    return ""; // incomplete config — emit no RRULE rather than an invalid one
                }
                freq = "MONTHLY";
            }
            default -> { return ""; }
        }

        StringBuilder rrule = new StringBuilder("RRULE:FREQ=").append(freq);

        if (interval > 1) {
            rrule.append(";INTERVAL=").append(interval);
        }
        if (byDay != null) {
            rrule.append(";BYDAY=").append(byDay);
        }
        if (appointment.getRecurrenceEndDate() != null) {
            rrule.append(";UNTIL=").append(
                    appointment.getRecurrenceEndDate().atTime(23, 59, 59).format(ICS_DATE_FORMAT));
        }

        rrule.append("\r\n");
        return rrule.toString();
    }

    /** Resolves the effective "every N" interval, defaulting to 1 when unset or invalid. */
    private int effectiveInterval(CalendarAppointment appointment) {
        Integer interval = appointment.getRecurrenceInterval();
        return (interval != null && interval > 0) ? interval : 1;
    }

    /**
     * Formats the BYDAY token for a monthly nth-weekday rule, e.g. {@code 2FR} for the
     * 2nd Friday or {@code -1MO} for the last Monday. Returns null if either the week
     * ordinal or the weekday is missing.
     */
    private String formatNthWeekday(CalendarAppointment appointment) {
        Integer week = appointment.getRecurrenceWeekOfMonth();
        java.time.DayOfWeek day = appointment.getRecurrenceDayOfWeek();
        if (week == null || day == null) {
            return null;
        }
        return week + icsWeekdayCode(day);
    }

    /** Two-letter RRULE weekday code (MO, TU, … SU) for a java.time DayOfWeek. */
    private String icsWeekdayCode(java.time.DayOfWeek day) {
        return switch (day) {
            case MONDAY -> "MO";
            case TUESDAY -> "TU";
            case WEDNESDAY -> "WE";
            case THURSDAY -> "TH";
            case FRIDAY -> "FR";
            case SATURDAY -> "SA";
            case SUNDAY -> "SU";
        };
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
