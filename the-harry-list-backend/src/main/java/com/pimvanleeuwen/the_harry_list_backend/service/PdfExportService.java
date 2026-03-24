package com.pimvanleeuwen.the_harry_list_backend.service;

import org.openpdf.text.*;
import org.openpdf.text.pdf.*;
import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.InvoiceType;
import com.pimvanleeuwen.the_harry_list_backend.model.PaymentOption;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.model.SpecialActivity;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

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
        PdfWriter writer = PdfWriter.getInstance(document, baos);

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

                // Add "Op rekening" invoice form for INVOICE payment reservations
                if (res.getPaymentOption() == PaymentOption.INVOICE) {
                    document.newPage();
                    addInvoiceForm(document, writer, res, locationName, date, primaryColor, titleFont, subtitleFont, headerFont, labelFont, valueFont, smallFont);
                }
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
        // Special activities
        Set<SpecialActivity> activities = res.getSpecialActivities();
        if (activities != null && !activities.isEmpty()) {
            String activitiesStr = activities.stream()
                    .map(SpecialActivity::getDisplayName)
                    .collect(Collectors.joining(", "));
            addField(leftContent, "Activities", activitiesStr, labelFont, valueFont);
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
        if (res.getPaymentOption() != null) {
            addField(rightContent, "Payment", res.getPaymentOption().getDisplayName(), labelFont, valueFont);
        }
        if (res.getInvoiceType() != null) {
            addField(rightContent, "Invoice Type", res.getInvoiceType().getDisplayName(), labelFont, valueFont);
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

        // Add catering info if present
        boolean hasCateringActivity = res.getSpecialActivities() != null && res.getSpecialActivities().stream()
                .anyMatch(a -> a == SpecialActivity.EAT_A_LA_CARTE || a == SpecialActivity.EAT_CATERING || a == SpecialActivity.CATERING_CORONA_ROOM);
        if (hasCateringActivity) {
            Paragraph cateringStatusPara = new Paragraph();
            cateringStatusPara.setSpacingBefore(10);
            cateringStatusPara.add(new Chunk("Catering Arranged: ", labelFont));
            Font arrangedFont = new Font(Font.HELVETICA, 10, Font.BOLD, res.isCateringArranged() ? new Color(34, 197, 94) : new Color(249, 115, 22));
            cateringStatusPara.add(new Chunk(res.isCateringArranged() ? "Yes ✓" : "Not yet", arrangedFont));
            contentCell.addElement(cateringStatusPara);
        }
        if (res.getCateringDietaryNotes() != null && !res.getCateringDietaryNotes().isEmpty()) {
            Paragraph cateringPara = new Paragraph();
            cateringPara.setSpacingBefore(5);
            cateringPara.add(new Chunk("Catering Dietary Notes: ", labelFont));
            cateringPara.add(new Chunk(res.getCateringDietaryNotes(), valueFont));
            contentCell.addElement(cateringPara);
        }

        // Add long reservation reason if present
        if (res.getLongReservationReason() != null && !res.getLongReservationReason().isEmpty()) {
            Paragraph reasonPara = new Paragraph();
            reasonPara.setSpacingBefore(5);
            reasonPara.add(new Chunk("Long Reservation Reason: ", labelFont));
            reasonPara.add(new Chunk(res.getLongReservationReason(), valueFont));
            contentCell.addElement(reasonPara);
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

    private void addInvoiceForm(Document document, PdfWriter writer, Reservation res, String locationName, LocalDate date,
                                 Color primaryColor, Font titleFont, Font subtitleFont,
                                 Font headerFont, Font labelFont, Font valueFont, Font smallFont)
            throws DocumentException {

        boolean isHubble = locationName.contains("Hubble");
        Color accentColor = isHubble ? new Color(86, 190, 195) : new Color(155, 141, 111); // teal bar / gold bar

        // "Form" label
        Font formLabelSmall = new Font(Font.HELVETICA, 11, Font.ITALIC, Color.DARK_GRAY);
        Paragraph formLabel = new Paragraph("Form", formLabelSmall);
        formLabel.setSpacingAfter(2);
        document.add(formLabel);

        // Title: "Op rekening / Payment via Invoice"
        Font bigTitleFont = new Font(Font.HELVETICA, 22, Font.BOLD, Color.BLACK);
        Paragraph bigTitle = new Paragraph("Op rekening / Payment via Invoice", bigTitleFont);
        bigTitle.setSpacingAfter(2);
        document.add(bigTitle);

        // Subtitle: "from Hubble/Meteor Community Café"
        Font fromFont = new Font(Font.HELVETICA, 11, Font.ITALIC, Color.DARK_GRAY);
        Paragraph fromPara = new Paragraph("from " + locationName, fromFont);
        fromPara.setSpacingAfter(18);
        document.add(fromPara);

        // --- Information section ---
        Font sectionFont = new Font(Font.HELVETICA, 14, Font.BOLD, Color.BLACK);
        Paragraph infoHeader = new Paragraph("Information", sectionFont);
        infoHeader.setSpacingAfter(8);
        document.add(infoHeader);

        // Two-column layout: left = form fields, right = "Attach receipt below"
        Font fldLabelFont = new Font(Font.HELVETICA, 11, Font.NORMAL, Color.BLACK);
        Font fldValueFont = new Font(Font.HELVETICA, 11, Font.NORMAL, Color.DARK_GRAY);
        Font italicFont = new Font(Font.HELVETICA, 11, Font.ITALIC, Color.DARK_GRAY);
        Font noteFont = new Font(Font.HELVETICA, 9, Font.ITALIC, Color.DARK_GRAY);

        PdfPTable infoTable = new PdfPTable(2);
        infoTable.setWidthPercentage(100);
        infoTable.setWidths(new float[]{55, 45});

        // Left column: fields
        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(Rectangle.NO_BORDER);
        leftCell.setPaddingRight(15);

        InvoiceType invoiceType = res.getInvoiceType();
        boolean isExternal = invoiceType == InvoiceType.EXTERNAL;

        Paragraph left = new Paragraph();
        left.setLeading(20);
        addInvoiceField(left, "Name:", res.getContactName(), fldLabelFont, fldValueFont);
        addInvoiceField(left, "Email:", res.getEmail(), fldLabelFont, fldValueFont);
        addInvoiceField(left, "Phone:", res.getPhoneNumber(), fldLabelFont, fldValueFont);

        if (isExternal) {
            // External invoice fields
            addInvoiceField(left, "Company:", res.getInvoiceName(), fldLabelFont, fldValueFont);
            addInvoiceField(left, "Address:", res.getInvoiceAddress(), fldLabelFont, fldValueFont);
            if (res.getInvoiceRemarks() != null && !res.getInvoiceRemarks().isEmpty()) {
                addInvoiceField(left, "Remarks:", res.getInvoiceRemarks(), fldLabelFont, fldValueFont);
            }
        } else {
            // TUE / FONTYS fields
            String institution = invoiceType != null ? invoiceType.getDisplayName() : null;
            addInvoiceField(left, "Institution:", institution, fldLabelFont, fldValueFont);
            addInvoiceField(left, "Kostenplaats*:", res.getCostCenter(), fldLabelFont, fldValueFont);
        }

        // Amount - left blank for physical fill-out, with euro sign
        left.add(new Chunk("Amount:    ", fldLabelFont));
        left.add(new Chunk("\u20AC ___________________________\n", fldValueFont));
        // Blank line
        left.add(new Chunk("\n", fldLabelFont));
        addInvoiceField(left, "Date:", null, fldLabelFont, fldValueFont);

        leftCell.addElement(left);
        infoTable.addCell(leftCell);

        // Right column: "Attach receipt below:" with bordered area
        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(Rectangle.NO_BORDER);

        Paragraph rightHeader = new Paragraph("Attach receipt below:", italicFont);
        rightHeader.setSpacingAfter(5);
        rightCell.addElement(rightHeader);

        // Empty bordered box for receipt
        PdfPTable receiptBox = new PdfPTable(1);
        receiptBox.setWidthPercentage(100);
        PdfPCell receiptCell = new PdfPCell(new Phrase("", fldValueFont));
        receiptCell.setMinimumHeight(120);
        receiptCell.setBorderColor(new Color(200, 200, 200));
        receiptCell.setBorderWidth(0.5f);
        receiptBox.addCell(receiptCell);
        rightCell.addElement(receiptBox);

        infoTable.addCell(rightCell);
        document.add(infoTable);

        // Signature line
        Paragraph sigPara = new Paragraph();
        sigPara.setSpacingBefore(20);
        sigPara.add(new Chunk("Signature:    ", fldLabelFont));
        sigPara.add(new Chunk("___________________________", fldValueFont));
        document.add(sigPara);

        // Kostenplaats footnote (only for TUE/FONTYS)
        if (!isExternal) {
            Paragraph kpNote = new Paragraph();
            kpNote.setSpacingBefore(12);
            kpNote.add(new Chunk("*Mandatory for TU/e and Fontys,\nordernumber is not kostenplaats!", noteFont));
            document.add(kpNote);
        }

        // --- Treasurer part ---
        Paragraph treasurerHeader = new Paragraph("Treasurer part", sectionFont);
        treasurerHeader.setSpacingBefore(30);
        treasurerHeader.setSpacingAfter(10);
        document.add(treasurerHeader);

        Paragraph treasurerFields = new Paragraph();
        treasurerFields.setLeading(20);
        addInvoiceField(treasurerFields, "Date:", null, fldLabelFont, fldValueFont);
        document.add(treasurerFields);

        Paragraph treasurerSig = new Paragraph();
        treasurerSig.setSpacingBefore(15);
        treasurerSig.add(new Chunk("Signature:    ", fldLabelFont));
        treasurerSig.add(new Chunk("___________________________", fldValueFont));
        document.add(treasurerSig);

        // --- Footer with company details (positioned at page bottom) ---
        float pageWidth = document.right() - document.left();
        float footerY = document.bottom() - 10; // just above the bottom margin

        // Accent bar - draw directly on the page
        PdfContentByte cb = writer.getDirectContent();
        cb.setColorFill(accentColor);
        cb.rectangle(document.left(), footerY + 30, pageWidth, 4);
        cb.fill();

        // Footer table positioned absolutely at the bottom
        Font footerFont = new Font(Font.HELVETICA, 8, Font.NORMAL, Color.GRAY);
        PdfPTable footerTable = new PdfPTable(3);
        footerTable.setTotalWidth(pageWidth);
        footerTable.setWidths(new float[]{33, 34, 33});

        if (isHubble) {
            addFooterCell(footerTable, "Hubble - Bar Potential B.V.\nDe Lampendriessen 31-05\n5612 AH EINDHOVEN", footerFont, Element.ALIGN_LEFT);
            addFooterCell(footerTable, "www.hubble.cafe\nboard@hubble.cafe\nHandelsnaam: Hubble", footerFont, Element.ALIGN_CENTER);
            addFooterCell(footerTable, "KvK: 68795920\nRSIN: NL857595842B01\nIBAN: NL65 RABO 0320 7856 45", footerFont, Element.ALIGN_RIGHT);
        } else {
            addFooterCell(footerTable, "Meteor Community Caf\u00E9\nEindhoven", footerFont, Element.ALIGN_LEFT);
            addFooterCell(footerTable, "www.meteor.cafe\nboard@meteor.cafe", footerFont, Element.ALIGN_CENTER);
            addFooterCell(footerTable, "", footerFont, Element.ALIGN_RIGHT);
        }
        footerTable.writeSelectedRows(0, -1, document.left(), footerY + 25, cb);
    }

    private void addInvoiceField(Paragraph para, String label, String value, Font labelFont, Font valueFont) {
        para.add(new Chunk(label + "    ", labelFont));
        if (value != null && !value.isEmpty()) {
            para.add(new Chunk(value + "\n", valueFont));
        } else {
            para.add(new Chunk("___________________________\n", valueFont));
        }
    }

    private void addFooterCell(PdfPTable table, String text, Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(alignment);
        cell.setPaddingTop(5);
        table.addCell(cell);
    }

    private void addField(Paragraph para, String label, String value, Font labelFont, Font valueFont) {
        if (value == null || value.isEmpty()) return;
        para.add(new Chunk(label + ": ", labelFont));
        para.add(new Chunk(value + "\n", valueFont));
    }
}
