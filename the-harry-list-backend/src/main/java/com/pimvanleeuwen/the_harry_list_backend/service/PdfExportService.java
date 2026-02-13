package com.pimvanleeuwen.the_harry_list_backend.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

@Service
public class PdfExportService {

    private final ReservationRepository reservationRepository;

    // Colors for Hubble and Meteor branding
    private static final Color HUBBLE_PRIMARY = new Color(15, 77, 100);    // #0f4d64
    private static final Color HUBBLE_LIGHT = new Color(189, 232, 236);    // #bde8ec
    private static final Color METEOR_PRIMARY = new Color(5, 56, 38);      // #053826
    private static final Color METEOR_ACCENT = new Color(155, 141, 111);   // #9B8D6F

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    public PdfExportService(ReservationRepository reservationRepository) {
        this.reservationRepository = reservationRepository;
    }

    public byte[] generateDailyReport(LocalDate date, BarLocation location, boolean confirmedOnly) throws DocumentException {
        List<Reservation> reservations = reservationRepository.findAll().stream()
                .filter(r -> r.getEventDate() != null && r.getEventDate().equals(date))
                .filter(r -> r.getLocation() != null && r.getLocation().equals(location))
                .filter(r -> !confirmedOnly || r.getStatus() == ReservationStatus.CONFIRMED)
                .sorted(Comparator.comparing(r -> r.getStartTime() != null ? r.getStartTime() : java.time.LocalTime.MAX))
                .toList();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 40, 40, 50, 50);
        PdfWriter.getInstance(document, baos);

        document.open();

        // Get colors based on location
        Color primaryColor = location == BarLocation.HUBBLE ? HUBBLE_PRIMARY : METEOR_PRIMARY;
        Color lightColor = location == BarLocation.HUBBLE ? HUBBLE_LIGHT : METEOR_ACCENT;

        // Fonts
        Font titleFont = new Font(Font.HELVETICA, 24, Font.BOLD, primaryColor);
        Font subtitleFont = new Font(Font.HELVETICA, 14, Font.NORMAL, Color.DARK_GRAY);
        Font headerFont = new Font(Font.HELVETICA, 12, Font.BOLD, Color.WHITE);
        Font labelFont = new Font(Font.HELVETICA, 10, Font.BOLD, Color.DARK_GRAY);
        Font valueFont = new Font(Font.HELVETICA, 10, Font.NORMAL, Color.BLACK);
        Font smallFont = new Font(Font.HELVETICA, 9, Font.NORMAL, Color.GRAY);

        // Title
        String locationName = location == BarLocation.HUBBLE ? "Hubble Community Café" : "Meteor Community Café";
        Paragraph title = new Paragraph(locationName, titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);

        // Date
        Paragraph datePara = new Paragraph("Reservations for " + date.format(DATE_FORMATTER), subtitleFont);
        datePara.setAlignment(Element.ALIGN_CENTER);
        datePara.setSpacingAfter(20);
        document.add(datePara);

        // Summary
        Paragraph summary = new Paragraph(
                String.format("Total reservations: %d | Total expected guests: %d",
                        reservations.size(),
                        reservations.stream().mapToInt(Reservation::getExpectedGuests).sum()),
                smallFont
        );
        summary.setAlignment(Element.ALIGN_CENTER);
        summary.setSpacingAfter(20);
        document.add(summary);

        if (reservations.isEmpty()) {
            Paragraph noReservations = new Paragraph("No reservations for this date.", valueFont);
            noReservations.setAlignment(Element.ALIGN_CENTER);
            noReservations.setSpacingBefore(40);
            document.add(noReservations);
        } else {
            // Add each reservation on its own page
            for (int i = 0; i < reservations.size(); i++) {
                if (i > 0) {
                    // Start a new page for each reservation after the first
                    document.newPage();

                    // Add header on each new page
                    Paragraph pageHeader = new Paragraph(locationName + " - " + date.format(DATE_FORMATTER), subtitleFont);
                    pageHeader.setAlignment(Element.ALIGN_CENTER);
                    pageHeader.setSpacingAfter(15);
                    document.add(pageHeader);
                }

                Reservation res = reservations.get(i);
                addReservationCard(document, res, i + 1, reservations.size(), primaryColor, lightColor, headerFont, labelFont, valueFont, smallFont);
            }
        }

        // Footer on last page
        Paragraph footer = new Paragraph(
                "Generated on " + LocalDate.now().format(DATE_FORMATTER) + " | The Harry List",
                smallFont
        );
        footer.setAlignment(Element.ALIGN_CENTER);
        footer.setSpacingBefore(30);
        document.add(footer);

        document.close();
        return baos.toByteArray();
    }

    private void addReservationCard(Document document, Reservation res, int number, int total,
                                     Color primaryColor, Color lightColor,
                                     Font headerFont, Font labelFont, Font valueFont, Font smallFont)
            throws DocumentException {

        // Create a table for the card layout
        PdfPTable card = new PdfPTable(1);
        card.setWidthPercentage(100);
        card.setSpacingBefore(15);
        card.setSpacingAfter(5);

        // Header row with reservation number and time
        PdfPCell headerCell = new PdfPCell();
        headerCell.setBackgroundColor(primaryColor);
        headerCell.setPadding(10);
        headerCell.setBorder(Rectangle.NO_BORDER);

        String timeStr = "";
        if (res.getStartTime() != null && res.getEndTime() != null) {
            timeStr = res.getStartTime().format(TIME_FORMATTER) + " - " + res.getEndTime().format(TIME_FORMATTER);
        }

        Paragraph headerText = new Paragraph();
        headerText.add(new Chunk("Reservation " + number + " of " + total + " | ", headerFont));
        headerText.add(new Chunk(res.getEventTitle() != null ? res.getEventTitle() : "Untitled Event", headerFont));
        if (!timeStr.isEmpty()) {
            headerText.add(new Chunk("  •  " + timeStr, headerFont));
        }
        headerText.add(new Chunk("  •  " + res.getExpectedGuests() + " guests", headerFont));
        headerCell.addElement(headerText);
        card.addCell(headerCell);

        // Content
        PdfPCell contentCell = new PdfPCell();
        contentCell.setBackgroundColor(new Color(250, 250, 250));
        contentCell.setPadding(15);
        contentCell.setBorder(Rectangle.BOX);
        contentCell.setBorderColor(new Color(220, 220, 220));

        // Create content table with 2 columns
        PdfPTable content = new PdfPTable(2);
        content.setWidthPercentage(100);
        content.setWidths(new float[]{1, 1});

        // Left column - Contact & Event details
        PdfPCell leftCol = new PdfPCell();
        leftCol.setBorder(Rectangle.NO_BORDER);
        leftCol.setPaddingRight(10);

        Paragraph leftContent = new Paragraph();
        addField(leftContent, "Contact", res.getContactName(), labelFont, valueFont);
        if (res.getOrganizationName() != null && !res.getOrganizationName().isEmpty()) {
            addField(leftContent, "Organization", res.getOrganizationName(), labelFont, valueFont);
        }
        addField(leftContent, "Email", res.getEmail(), labelFont, valueFont);
        if (res.getPhoneNumber() != null && !res.getPhoneNumber().isEmpty()) {
            addField(leftContent, "Phone", res.getPhoneNumber(), labelFont, valueFont);
        }
        if (res.getOrganizerType() != null) {
            addField(leftContent, "Type", res.getOrganizerType().getDisplayName(), labelFont, valueFont);
        }
        if (res.getEventType() != null) {
            addField(leftContent, "Event Type", res.getEventType().getDisplayName(), labelFont, valueFont);
        }
        leftCol.addElement(leftContent);
        content.addCell(leftCol);

        // Right column - Logistics & Payment
        PdfPCell rightCol = new PdfPCell();
        rightCol.setBorder(Rectangle.NO_BORDER);
        rightCol.setPaddingLeft(10);

        Paragraph rightContent = new Paragraph();
        addField(rightContent, "Status", res.getStatus() != null ? res.getStatus().name() : "Unknown", labelFont, valueFont);
        if (res.getSeatingArea() != null) {
            addField(rightContent, "Seating", res.getSeatingArea().getDisplayName(), labelFont, valueFont);
        }
        if (res.getSpecificArea() != null && !res.getSpecificArea().isEmpty()) {
            addField(rightContent, "Area Notes", res.getSpecificArea(), labelFont, valueFont);
        }
        if (res.getPaymentOption() != null) {
            addField(rightContent, "Payment", res.getPaymentOption().getDisplayName(), labelFont, valueFont);
        }
        if (res.getCostCenter() != null && !res.getCostCenter().isEmpty()) {
            addField(rightContent, "Cost Center", res.getCostCenter(), labelFont, valueFont);
        }
        if (res.getInvoiceName() != null && !res.getInvoiceName().isEmpty()) {
            addField(rightContent, "Invoice Name", res.getInvoiceName(), labelFont, valueFont);
        }
        rightCol.addElement(rightContent);
        content.addCell(rightCol);

        contentCell.addElement(content);

        // Add food info if required
        if (Boolean.TRUE.equals(res.getFoodRequired())) {
            Paragraph foodPara = new Paragraph();
            foodPara.setSpacingBefore(10);
            foodPara.add(new Chunk("Food Required: ", labelFont));
            String foodDetails = "Yes";
            if (res.getDietaryPreference() != null) {
                foodDetails += " - " + res.getDietaryPreference().getDisplayName();
            }
            if (res.getDietaryNotes() != null && !res.getDietaryNotes().isEmpty()) {
                foodDetails += " (" + res.getDietaryNotes() + ")";
            }
            foodPara.add(new Chunk(foodDetails, valueFont));
            contentCell.addElement(foodPara);
        }

        // Add description if present
        if (res.getDescription() != null && !res.getDescription().isEmpty()) {
            Paragraph descPara = new Paragraph();
            descPara.setSpacingBefore(10);
            descPara.add(new Chunk("Description: ", labelFont));
            descPara.add(new Chunk(res.getDescription(), valueFont));
            contentCell.addElement(descPara);
        }

        // Add comments if present
        if (res.getComments() != null && !res.getComments().isEmpty()) {
            Paragraph commentsPara = new Paragraph();
            commentsPara.setSpacingBefore(5);
            commentsPara.add(new Chunk("Comments: ", labelFont));
            commentsPara.add(new Chunk(res.getComments(), valueFont));
            contentCell.addElement(commentsPara);
        }

        // Add internal notes if present
        if (res.getInternalNotes() != null && !res.getInternalNotes().isEmpty()) {
            Paragraph notesPara = new Paragraph();
            notesPara.setSpacingBefore(5);
            notesPara.add(new Chunk("Internal Notes: ", labelFont));
            notesPara.add(new Chunk(res.getInternalNotes(), smallFont));
            contentCell.addElement(notesPara);
        }

        // Confirmation info
        Paragraph refPara = new Paragraph();
        refPara.setSpacingBefore(10);
        refPara.add(new Chunk("Ref: " + (res.getConfirmationNumber() != null ? res.getConfirmationNumber() : "N/A"), smallFont));
        if (res.getConfirmedBy() != null && !res.getConfirmedBy().isEmpty()) {
            refPara.add(new Chunk(" | Confirmed by: " + res.getConfirmedBy(), smallFont));
        }
        contentCell.addElement(refPara);

        card.addCell(contentCell);
        document.add(card);
    }

    private void addField(Paragraph para, String label, String value, Font labelFont, Font valueFont) {
        if (value == null || value.isEmpty()) return;
        para.add(new Chunk(label + ": ", labelFont));
        para.add(new Chunk(value + "\n", valueFont));
    }
}

