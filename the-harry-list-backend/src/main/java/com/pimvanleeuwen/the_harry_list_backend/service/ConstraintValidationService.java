package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.repository.BlockedPeriodRepository;
import com.pimvanleeuwen.the_harry_list_backend.repository.FormConstraintRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Validates reservation submissions against dynamic form constraints
 * and blocked periods configured by staff.
 */
@Service
public class ConstraintValidationService {

    private final FormConstraintRepository constraintRepository;
    private final BlockedPeriodRepository blockedPeriodRepository;

    public ConstraintValidationService(FormConstraintRepository constraintRepository,
                                        BlockedPeriodRepository blockedPeriodRepository) {
        this.constraintRepository = constraintRepository;
        this.blockedPeriodRepository = blockedPeriodRepository;
    }

    /**
     * Validate a reservation against all active constraints and blocked periods.
     * @return list of violation messages; empty if valid
     */
    public List<String> validate(Set<SpecialActivity> activities,
                                  BarLocation location,
                                  SeatingArea seatingArea,
                                  LocalDate eventDate,
                                  LocalTime startTime,
                                  Integer expectedGuests) {
        List<String> violations = new ArrayList<>();

        if (activities == null || activities.isEmpty()) {
            // No activities selected — only check blocked periods
            validateBlockedPeriods(eventDate, location, violations);
            return violations;
        }

        List<FormConstraint> constraints = constraintRepository.findByEnabledTrue();

        for (FormConstraint constraint : constraints) {
            if (constraint.getConstraintType() == FormConstraintType.GUEST_MINIMUM) {
                validateGuestMinimum(expectedGuests, location, constraint, violations);
                continue;
            }

            String trigger = constraint.getTriggerActivity();
            boolean hasTrigger = activities.stream()
                    .anyMatch(a -> a.name().equals(trigger));

            if (!hasTrigger) continue;

            switch (constraint.getConstraintType()) {
                case ACTIVITY_CONFLICT:
                    validateActivityConflict(activities, constraint, violations);
                    break;
                case LOCATION_LOCK:
                    validateLocationLock(location, constraint, violations);
                    break;
                case SEATING_LOCK:
                    validateSeatingLock(seatingArea, constraint, violations);
                    break;
                case ADVANCE_BOOKING:
                    validateAdvanceBooking(eventDate, constraint, violations);
                    break;
                case GUEST_LIMIT:
                    validateGuestLimit(expectedGuests, constraint, violations);
                    break;
                case TIME_RESTRICTION:
                    // Time restrictions are informational for the frontend;
                    // no server-side enforcement needed (early slots are allowed
                    // when the triggering activity is selected)
                    break;
                default:
                    break;
            }
        }

        validateBlockedPeriods(eventDate, location, violations);

        return violations;
    }

    private void validateActivityConflict(Set<SpecialActivity> activities,
                                           FormConstraint constraint,
                                           List<String> violations) {
        String conflicting = constraint.getTargetValue();
        boolean hasConflict = activities.stream()
                .anyMatch(a -> a.name().equals(conflicting));
        if (hasConflict) {
            violations.add(constraint.getMessage());
        }
    }

    private void validateLocationLock(BarLocation location,
                                       FormConstraint constraint,
                                       List<String> violations) {
        if (location == null || location == BarLocation.NO_PREFERENCE) {
            // NO_PREFERENCE is acceptable — admin will set before confirming
            return;
        }
        String requiredLocation = constraint.getTargetValue();
        if (!location.name().equals(requiredLocation)) {
            violations.add(constraint.getMessage());
        }
    }

    private void validateSeatingLock(SeatingArea seatingArea,
                                      FormConstraint constraint,
                                      List<String> violations) {
        if (seatingArea == null) return;
        String requiredSeating = constraint.getTargetValue();
        if (!seatingArea.name().equals(requiredSeating)) {
            violations.add(constraint.getMessage());
        }
    }

    private void validateAdvanceBooking(LocalDate eventDate,
                                         FormConstraint constraint,
                                         List<String> violations) {
        if (eventDate == null || constraint.getNumericValue() == null) return;
        LocalDate minDate = LocalDate.now().plusDays(constraint.getNumericValue());
        if (eventDate.isBefore(minDate)) {
            violations.add(constraint.getMessage());
        }
    }

    private void validateGuestMinimum(Integer expectedGuests,
                                       BarLocation location,
                                       FormConstraint constraint,
                                       List<String> violations) {
        if (expectedGuests == null || constraint.getNumericValue() == null) return;
        // targetValue is the location this minimum applies to (null means all locations)
        String targetLocation = constraint.getTargetValue();
        if (targetLocation != null && (location == null || !location.name().equals(targetLocation))) {
            return; // Constraint applies to a different location
        }
        if (expectedGuests < constraint.getNumericValue()) {
            violations.add(constraint.getMessage());
        }
    }

    private void validateGuestLimit(Integer expectedGuests,
                                     FormConstraint constraint,
                                     List<String> violations) {
        if (expectedGuests == null || constraint.getNumericValue() == null) return;
        if (expectedGuests > constraint.getNumericValue()) {
            violations.add(constraint.getMessage());
        }
    }

    private void validateBlockedPeriods(LocalDate eventDate,
                                         BarLocation location,
                                         List<String> violations) {
        if (eventDate == null) return;
        BarLocation queryLocation = (location == null || location == BarLocation.NO_PREFERENCE)
                ? null : location;

        List<BlockedPeriod> blocking;
        if (queryLocation != null) {
            blocking = blockedPeriodRepository.findBlockingPeriods(eventDate, queryLocation);
        } else {
            // For NO_PREFERENCE, check global blocks (location IS NULL)
            blocking = blockedPeriodRepository.findBlockingPeriods(eventDate, null);
        }

        for (BlockedPeriod bp : blocking) {
            String msg = bp.getPublicMessage() != null ? bp.getPublicMessage()
                    : "This date is not available for reservations";
            violations.add(msg);
        }
    }
}
