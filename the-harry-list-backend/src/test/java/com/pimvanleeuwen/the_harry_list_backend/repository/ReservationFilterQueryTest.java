package com.pimvanleeuwen.the_harry_list_backend.repository;

import com.pimvanleeuwen.the_harry_list_backend.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Runs {@link ReservationFilter} against a real (H2) database. The service tests stub the
 * repository with {@link ReservationFilter#matches}, so this test is what keeps that plain-Java
 * rule and the database query in agreement.
 */
@SpringBootTest
@Transactional
class ReservationFilterQueryTest {

    private static final LocalDate DAY = LocalDate.of(2031, 5, 14);

    @Autowired
    private ReservationRepository repository;

    private Reservation hubbleCatering;
    private Reservation hubblePlain;
    private Reservation meteorCatering;
    private Reservation hubbleLater;
    private Reservation hubbleEarlierPending;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
        hubbleCatering = save(DAY, BarLocation.HUBBLE, ReservationStatus.CONFIRMED,
                Set.of(SpecialActivity.EAT_CATERING, SpecialActivity.GRADUATION));
        hubblePlain = save(DAY, BarLocation.HUBBLE, ReservationStatus.CONFIRMED, Set.of());
        meteorCatering = save(DAY, BarLocation.METEOR, ReservationStatus.CONFIRMED,
                Set.of(SpecialActivity.CATERING_CORONA_ROOM));
        hubbleLater = save(DAY.plusDays(3), BarLocation.HUBBLE, ReservationStatus.PENDING,
                Set.of(SpecialActivity.GRADUATION));
        hubbleEarlierPending = save(DAY.minusDays(3), BarLocation.HUBBLE, ReservationStatus.PENDING,
                Set.of(SpecialActivity.EAT_A_LA_CARTE));
    }

    @Test
    void theDatabaseQueryAgreesWithMatchesForEveryKindOfFilter() {
        List<ReservationFilter> filters = List.of(
                ReservationFilter.any(),
                ReservationFilter.any().from(DAY),
                ReservationFilter.any().on(DAY),
                ReservationFilter.any().at(BarLocation.HUBBLE),
                ReservationFilter.any().withStatuses(List.of(ReservationStatus.CONFIRMED)),
                ReservationFilter.any().withStatuses(List.of(ReservationStatus.PENDING, ReservationStatus.REJECTED)),
                ReservationFilter.any().withCatering(true),
                ReservationFilter.any().withCatering(false),
                ReservationFilter.any().on(DAY).at(BarLocation.HUBBLE)
                        .withStatuses(List.of(ReservationStatus.CONFIRMED)).withCatering(true));
        List<Reservation> all = repository.findAll();

        for (ReservationFilter filter : filters) {
            List<Long> expected = all.stream().filter(filter::matches).map(Reservation::getId).sorted().toList();
            assertEquals(expected, ids(repository.findMatching(filter)), filter.toString());
        }
    }

    @Test
    void cateringMeansAtLeastOneFoodActivity() {
        assertEquals(sorted(hubbleCatering, meteorCatering, hubbleEarlierPending),
                ids(repository.findMatching(ReservationFilter.any().withCatering(true))));
        // A reservation without any activities counts as non-catering.
        assertEquals(sorted(hubblePlain, hubbleLater),
                ids(repository.findMatching(ReservationFilter.any().withCatering(false))));
    }

    @Test
    void thePdfDayReportFilter() {
        ReservationFilter dayReport = ReservationFilter.any().on(DAY).at(BarLocation.HUBBLE)
                .withStatuses(List.of(ReservationStatus.CONFIRMED)).withCatering(true);

        assertEquals(sorted(hubbleCatering), ids(repository.findMatching(dayReport)));
    }

    private Reservation save(LocalDate date, BarLocation location, ReservationStatus status,
                             Set<SpecialActivity> activities) {
        Reservation r = new Reservation();
        r.setContactName("Guest");
        r.setEmail("guest@example.com");
        r.setEventTitle("Event");
        r.setDescription("Description");
        r.setEventDate(date);
        r.setStartTime(LocalTime.of(18, 0));
        r.setEndTime(LocalTime.of(20, 0));
        r.setLocation(location);
        r.setSeatingArea(SeatingArea.INSIDE);
        r.setPaymentOption(PaymentOption.INDIVIDUAL);
        r.setStatus(status);
        r.setSpecialActivities(new java.util.HashSet<>(activities));
        return repository.saveAndFlush(r);
    }

    private static List<Long> ids(List<Reservation> reservations) {
        return reservations.stream().map(Reservation::getId).sorted().toList();
    }

    private static List<Long> sorted(Reservation... reservations) {
        return ids(List.of(reservations));
    }
}
