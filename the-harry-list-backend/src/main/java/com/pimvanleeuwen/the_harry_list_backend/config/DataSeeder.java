package com.pimvanleeuwen.the_harry_list_backend.config;

import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

@Component
@Profile("dev")
@Order(2)
public class DataSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataSeeder.class);

    private final ReservationRepository reservationRepository;

    public DataSeeder(ReservationRepository reservationRepository) {
        this.reservationRepository = reservationRepository;
    }

    @Override
    public void run(String... args) {
        if (reservationRepository.count() > 0) {
            logger.info("Database already contains reservations, skipping seed data");
            return;
        }

        LocalDate today = LocalDate.now();

        // 1. Graduation at Hubble with EAT_CATERING, GRADUATION, INVOICE/TUE, 50 guests
        Reservation r1 = new Reservation();
        r1.setContactName("Jan de Vries");
        r1.setEmail("jan.devries@test.example.com");
        r1.setPhoneNumber("+31612345678");
        r1.setOrganizationName("TU/e Computer Science");
        r1.setEventTitle("PhD Defense Celebration");
        r1.setDescription("Celebration after PhD defense ceremony with catering for colleagues and family.");
        r1.setSpecialActivities(Set.of(SpecialActivity.EAT_CATERING, SpecialActivity.GRADUATION));
        r1.setExpectedGuests(50);
        r1.setEventDate(today.plusDays(3));
        r1.setStartTime(LocalTime.of(15, 0));
        r1.setEndTime(LocalTime.of(18, 0));
        r1.setLocation(BarLocation.HUBBLE);
        r1.setSeatingArea(SeatingArea.INSIDE);
        r1.setPaymentOption(PaymentOption.INVOICE);
        r1.setInvoiceType(InvoiceType.TUE);
        r1.setCostCenter("WCS-2024-0142");
        r1.setTermsAccepted(true);
        reservationRepository.save(r1);

        // 2. Private event at Meteor, ONE_PERSON payment, 30 guests
        Reservation r2 = new Reservation();
        r2.setContactName("Sophie van den Berg");
        r2.setEmail("sophie.vdb@test.example.com");
        r2.setPhoneNumber("+31698765432");
        r2.setEventTitle("Birthday Party");
        r2.setDescription("Surprise birthday party for a friend turning 30.");
        r2.setSpecialActivities(Set.of(SpecialActivity.PRIVATE_EVENT));
        r2.setExpectedGuests(30);
        r2.setEventDate(today.plusDays(5));
        r2.setStartTime(LocalTime.of(19, 0));
        r2.setEndTime(LocalTime.of(22, 0));
        r2.setLocation(BarLocation.METEOR);
        r2.setSeatingArea(SeatingArea.INSIDE);
        r2.setPaymentOption(PaymentOption.ONE_PERSON);
        r2.setTermsAccepted(true);
        reservationRepository.save(r2);

        // 3. Simple borrel, no special activities, INDIVIDUAL payment, Hubble, 20 guests
        Reservation r3 = new Reservation();
        r3.setContactName("Pieter Jansen");
        r3.setEmail("pieter.jansen@test.example.com");
        r3.setPhoneNumber("+31687654321");
        r3.setOrganizationName("Study Association GEWIS");
        r3.setEventTitle("Friday Afternoon Borrel");
        r3.setDescription("Weekly get-together for association members after lectures.");
        r3.setSpecialActivities(Set.of());
        r3.setExpectedGuests(20);
        r3.setEventDate(today.plusDays(2));
        r3.setStartTime(LocalTime.of(16, 30));
        r3.setEndTime(LocalTime.of(19, 0));
        r3.setLocation(BarLocation.HUBBLE);
        r3.setSeatingArea(SeatingArea.INSIDE);
        r3.setPaymentOption(PaymentOption.INDIVIDUAL);
        r3.setTermsAccepted(true);
        reservationRepository.save(r3);

        // 4. Catering in corona room at Hubble, INVOICE/FONTYS, 40 guests, early start
        Reservation r4 = new Reservation();
        r4.setContactName("Lisa Bakker");
        r4.setEmail("lisa.bakker@test.example.com");
        r4.setPhoneNumber("+31623456789");
        r4.setOrganizationName("Fontys ICT");
        r4.setEventTitle("Faculty Meeting with Lunch");
        r4.setDescription("Quarterly faculty meeting with catering in the Corona Room.");
        r4.setSpecialActivities(Set.of(SpecialActivity.CATERING_CORONA_ROOM));
        r4.setExpectedGuests(40);
        r4.setEventDate(today.plusDays(7));
        r4.setStartTime(LocalTime.of(9, 30));
        r4.setEndTime(LocalTime.of(12, 30));
        r4.setLocation(BarLocation.HUBBLE);
        r4.setSeatingArea(SeatingArea.INSIDE);
        r4.setPaymentOption(PaymentOption.INVOICE);
        r4.setInvoiceType(InvoiceType.FONTYS);
        r4.setCostCenter("FONTYS-ICT-8823");
        r4.setTermsAccepted(true);
        reservationRepository.save(r4);

        // 5. Lunch with EAT_A_LA_CARTE, INDIVIDUAL payment, NO_PREFERENCE, 12 guests
        Reservation r5 = new Reservation();
        r5.setContactName("Emma Smit");
        r5.setEmail("emma.smit@test.example.com");
        r5.setPhoneNumber("+31634567890");
        r5.setEventTitle("Team Lunch");
        r5.setDescription("Casual team lunch to celebrate end of project sprint.");
        r5.setSpecialActivities(Set.of(SpecialActivity.EAT_A_LA_CARTE));
        r5.setExpectedGuests(12);
        r5.setEventDate(today.plusDays(4));
        r5.setStartTime(LocalTime.of(12, 0));
        r5.setEndTime(LocalTime.of(14, 0));
        r5.setLocation(BarLocation.NO_PREFERENCE);
        r5.setSeatingArea(SeatingArea.INSIDE);
        r5.setPaymentOption(PaymentOption.INDIVIDUAL);
        r5.setTermsAccepted(true);
        reservationRepository.save(r5);

        // 6. Large event with EAT_CATERING + GRADUATION, INVOICE/EXTERNAL, 65 guests, long reservation
        Reservation r6 = new Reservation();
        r6.setContactName("Thomas Mulder");
        r6.setEmail("thomas.mulder@test.example.com");
        r6.setPhoneNumber("+31645678901");
        r6.setOrganizationName("Acme Tech B.V.");
        r6.setEventTitle("Master Graduation Celebration");
        r6.setDescription("Large graduation celebration for the entire cohort with full catering package.");
        r6.setSpecialActivities(Set.of(SpecialActivity.EAT_CATERING, SpecialActivity.GRADUATION));
        r6.setExpectedGuests(65);
        r6.setEventDate(today.plusDays(10));
        r6.setStartTime(LocalTime.of(14, 0));
        r6.setEndTime(LocalTime.of(21, 0));
        r6.setLongReservationReason("Ceremony followed by dinner and evening celebration for graduating cohort.");
        r6.setLocation(BarLocation.HUBBLE);
        r6.setSeatingArea(SeatingArea.INSIDE);
        r6.setPaymentOption(PaymentOption.INVOICE);
        r6.setInvoiceType(InvoiceType.EXTERNAL);
        r6.setInvoiceName("Acme Tech B.V.");
        r6.setInvoiceAddress("Keizersgracht 123, 1015 CJ Amsterdam");
        r6.setInvoiceRemarks("Attention: Finance department. PO number AT-2024-0567.");
        r6.setTermsAccepted(true);
        reservationRepository.save(r6);

        // 7. Small get-together at Meteor, no activities, ONE_PERSON, 10 guests
        Reservation r7 = new Reservation();
        r7.setContactName("Daan Visser");
        r7.setEmail("daan.visser@test.example.com");
        r7.setPhoneNumber("+31656789012");
        r7.setEventTitle("Board Game Evening");
        r7.setDescription("Small informal board game night with friends.");
        r7.setSpecialActivities(Set.of());
        r7.setExpectedGuests(10);
        r7.setEventDate(today.plusDays(6));
        r7.setStartTime(LocalTime.of(18, 0));
        r7.setEndTime(LocalTime.of(21, 0));
        r7.setLocation(BarLocation.METEOR);
        r7.setSeatingArea(SeatingArea.INSIDE);
        r7.setPaymentOption(PaymentOption.ONE_PERSON);
        r7.setTermsAccepted(true);
        reservationRepository.save(r7);

        // 8. Outdoor event at Hubble, INDIVIDUAL payment, OUTSIDE seating, 25 guests
        Reservation r8 = new Reservation();
        r8.setContactName("Fleur de Groot");
        r8.setEmail("fleur.degroot@test.example.com");
        r8.setPhoneNumber("+31667890123");
        r8.setOrganizationName("ESA Eindhoven");
        r8.setEventTitle("Summer Terrace Drinks");
        r8.setDescription("Outdoor social drinks on the terrace to welcome new members.");
        r8.setSpecialActivities(Set.of());
        r8.setExpectedGuests(25);
        r8.setEventDate(today.plusDays(8));
        r8.setStartTime(LocalTime.of(16, 0));
        r8.setEndTime(LocalTime.of(19, 0));
        r8.setLocation(BarLocation.HUBBLE);
        r8.setSeatingArea(SeatingArea.OUTSIDE);
        r8.setPaymentOption(PaymentOption.INDIVIDUAL);
        r8.setTermsAccepted(true);
        reservationRepository.save(r8);

        // 9. Catering event with dietary notes, Meteor, 35 guests
        Reservation r9 = new Reservation();
        r9.setContactName("Bram Hendriks");
        r9.setEmail("bram.hendriks@test.example.com");
        r9.setPhoneNumber("+31678901234");
        r9.setOrganizationName("TU/e Innovation Lab");
        r9.setEventTitle("Workshop Closing Dinner");
        r9.setDescription("Dinner after a full-day innovation workshop with international participants.");
        r9.setSpecialActivities(Set.of(SpecialActivity.EAT_CATERING));
        r9.setExpectedGuests(35);
        r9.setEventDate(today.plusDays(9));
        r9.setStartTime(LocalTime.of(17, 30));
        r9.setEndTime(LocalTime.of(20, 30));
        r9.setLocation(BarLocation.METEOR);
        r9.setSeatingArea(SeatingArea.INSIDE);
        r9.setPaymentOption(PaymentOption.INVOICE);
        r9.setInvoiceType(InvoiceType.TUE);
        r9.setCostCenter("IL-WORKSHOP-2024");
        r9.setCateringDietaryNotes("3 vegetarian, 2 vegan, 1 gluten-free, 1 nut allergy.");
        r9.setTermsAccepted(true);
        reservationRepository.save(r9);

        // 10. CONFIRMED private event at Meteor, 45 guests
        Reservation r10 = new Reservation();
        r10.setContactName("Anna Willemsen");
        r10.setEmail("anna.willemsen@test.example.com");
        r10.setPhoneNumber("+31689012345");
        r10.setOrganizationName("Study Association Lucid");
        r10.setEventTitle("Annual Members Gala");
        r10.setDescription("Formal gala evening for association members with drinks and snacks.");
        r10.setSpecialActivities(Set.of(SpecialActivity.PRIVATE_EVENT));
        r10.setExpectedGuests(45);
        r10.setEventDate(today.plusDays(12));
        r10.setStartTime(LocalTime.of(19, 0));
        r10.setEndTime(LocalTime.of(23, 0));
        r10.setLocation(BarLocation.METEOR);
        r10.setSeatingArea(SeatingArea.INSIDE);
        r10.setPaymentOption(PaymentOption.ONE_PERSON);
        r10.setTermsAccepted(true);
        r10.setStatus(ReservationStatus.CONFIRMED);
        r10.setConfirmedBy("admin@hubble.nl");
        reservationRepository.save(r10);

        logger.info("Seeded 10 sample reservations for dev profile");
    }
}
