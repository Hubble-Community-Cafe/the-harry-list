package com.pimvanleeuwen.the_harry_list_backend.repository;

import com.pimvanleeuwen.the_harry_list_backend.model.BarLocation;
import com.pimvanleeuwen.the_harry_list_backend.model.Reservation;
import com.pimvanleeuwen.the_harry_list_backend.model.ReservationStatus;
import com.pimvanleeuwen.the_harry_list_backend.model.SpecialActivity;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;

/**
 * Which reservations to load for a calendar feed or a PDF day report. Every criterion is
 * optional (null means "any"), and the database does the filtering ({@link #toSpecification()}).
 *
 * <p>{@link #matches(Reservation)} states the same rule in plain Java for unit tests;
 * {@code ReservationFilterQueryTest} checks on a real database that both agree.
 *
 * @param from      earliest event date, inclusive
 * @param to        latest event date, inclusive
 * @param location  only this bar
 * @param statuses  only these statuses (null or empty: any status)
 * @param catering  true: only reservations with a catering activity; false: only without
 */
public record ReservationFilter(LocalDate from, LocalDate to, BarLocation location,
                                Set<ReservationStatus> statuses, Boolean catering) {

    public ReservationFilter {
        statuses = statuses == null || statuses.isEmpty() ? null : Set.copyOf(statuses);
    }

    public static ReservationFilter any() {
        return new ReservationFilter(null, null, null, null, null);
    }

    public ReservationFilter from(LocalDate from) {
        return new ReservationFilter(from, to, location, statuses, catering);
    }

    public ReservationFilter on(LocalDate date) {
        return new ReservationFilter(date, date, location, statuses, catering);
    }

    public ReservationFilter at(BarLocation location) {
        return new ReservationFilter(from, to, location, statuses, catering);
    }

    public ReservationFilter withStatuses(Collection<ReservationStatus> statuses) {
        return new ReservationFilter(from, to, location, statuses == null ? null : Set.copyOf(statuses), catering);
    }

    public ReservationFilter withCatering(Boolean catering) {
        return new ReservationFilter(from, to, location, statuses, catering);
    }

    public Specification<Reservation> toSpecification() {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("eventDate"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("eventDate"), to));
            }
            if (location != null) {
                predicates.add(cb.equal(root.get("location"), location));
            }
            if (statuses != null) {
                predicates.add(root.get("status").in(statuses));
            }
            if (catering != null) {
                Subquery<Long> withCatering = query.subquery(Long.class);
                Root<Reservation> sub = withCatering.from(Reservation.class);
                Join<Reservation, SpecialActivity> activity = sub.join("specialActivities");
                withCatering.select(sub.get("id")).where(
                        cb.equal(sub.get("id"), root.get("id")),
                        activity.in(SpecialActivity.catering()));
                predicates.add(catering ? cb.exists(withCatering) : cb.not(cb.exists(withCatering)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    /** The same rule as {@link #toSpecification()}, for tests that stub the repository. */
    public boolean matches(Reservation r) {
        return (from == null || (r.getEventDate() != null && !r.getEventDate().isBefore(from)))
                && (to == null || (r.getEventDate() != null && !r.getEventDate().isAfter(to)))
                && (location == null || location == r.getLocation())
                && (statuses == null || statuses.contains(r.getStatus()))
                && (catering == null || catering == r.hasCateringActivity());
    }
}
