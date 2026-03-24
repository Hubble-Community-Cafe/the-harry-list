package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.model.*;
import com.pimvanleeuwen.the_harry_list_backend.repository.BlockedPeriodRepository;
import com.pimvanleeuwen.the_harry_list_backend.repository.FormConstraintRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConstraintValidationServiceTest {

    @Mock
    private FormConstraintRepository constraintRepository;

    @Mock
    private BlockedPeriodRepository blockedPeriodRepository;

    private ConstraintValidationService service;

    @BeforeEach
    void setUp() {
        service = new ConstraintValidationService(constraintRepository, blockedPeriodRepository);
    }

    @Test
    void validate_shouldPassWithNoConstraints() {
        when(constraintRepository.findByEnabledTrue()).thenReturn(List.of());

        List<String> violations = service.validate(
                Set.of(SpecialActivity.GRADUATION),
                BarLocation.HUBBLE,
                SeatingArea.INSIDE,
                LocalDate.now().plusDays(3),
                LocalTime.of(14, 0),
                50);

        assertTrue(violations.isEmpty());
    }

    @Test
    void validate_shouldDetectActivityConflict() {
        FormConstraint conflict = FormConstraint.builder()
                .constraintType(FormConstraintType.ACTIVITY_CONFLICT)
                .triggerActivity("EAT_CATERING")
                .targetValue("EAT_A_LA_CARTE")
                .message("Catering and à la carte cannot be combined")
                .enabled(true)
                .build();

        when(constraintRepository.findByEnabledTrue()).thenReturn(List.of(conflict));

        List<String> violations = service.validate(
                Set.of(SpecialActivity.EAT_CATERING, SpecialActivity.EAT_A_LA_CARTE),
                BarLocation.HUBBLE,
                SeatingArea.INSIDE,
                LocalDate.now().plusDays(10),
                LocalTime.of(12, 0),
                10);

        assertEquals(1, violations.size());
        assertTrue(violations.get(0).contains("Catering and à la carte"));
    }

    @Test
    void validate_shouldNotFlagActivityConflictWhenNotBothSelected() {
        FormConstraint conflict = FormConstraint.builder()
                .constraintType(FormConstraintType.ACTIVITY_CONFLICT)
                .triggerActivity("EAT_CATERING")
                .targetValue("EAT_A_LA_CARTE")
                .message("Catering and à la carte cannot be combined")
                .enabled(true)
                .build();

        when(constraintRepository.findByEnabledTrue()).thenReturn(List.of(conflict));

        List<String> violations = service.validate(
                Set.of(SpecialActivity.EAT_CATERING),
                BarLocation.HUBBLE,
                SeatingArea.INSIDE,
                LocalDate.now().plusDays(10),
                LocalTime.of(12, 0),
                10);

        assertTrue(violations.isEmpty());
    }

    @Test
    void validate_shouldDetectLocationLockViolation() {
        FormConstraint lock = FormConstraint.builder()
                .constraintType(FormConstraintType.LOCATION_LOCK)
                .triggerActivity("CATERING_CORONA_ROOM")
                .targetValue("HUBBLE")
                .message("Corona Room is only at Hubble")
                .enabled(true)
                .build();

        when(constraintRepository.findByEnabledTrue()).thenReturn(List.of(lock));

        List<String> violations = service.validate(
                Set.of(SpecialActivity.CATERING_CORONA_ROOM),
                BarLocation.METEOR,
                SeatingArea.INSIDE,
                LocalDate.now().plusDays(10),
                LocalTime.of(12, 0),
                20);

        assertEquals(1, violations.size());
        assertTrue(violations.get(0).contains("Hubble"));
    }

    @Test
    void validate_shouldAllowNoPreferenceForLocationLock() {
        FormConstraint lock = FormConstraint.builder()
                .constraintType(FormConstraintType.LOCATION_LOCK)
                .triggerActivity("CATERING_CORONA_ROOM")
                .targetValue("HUBBLE")
                .message("Corona Room is only at Hubble")
                .enabled(true)
                .build();

        when(constraintRepository.findByEnabledTrue()).thenReturn(List.of(lock));

        List<String> violations = service.validate(
                Set.of(SpecialActivity.CATERING_CORONA_ROOM),
                BarLocation.NO_PREFERENCE,
                SeatingArea.INSIDE,
                LocalDate.now().plusDays(10),
                LocalTime.of(12, 0),
                20);

        assertTrue(violations.isEmpty());
    }

    @Test
    void validate_shouldDetectSeatingLockViolation() {
        FormConstraint lock = FormConstraint.builder()
                .constraintType(FormConstraintType.SEATING_LOCK)
                .triggerActivity("CATERING_CORONA_ROOM")
                .targetValue("INSIDE")
                .message("Corona Room requires inside seating")
                .enabled(true)
                .build();

        when(constraintRepository.findByEnabledTrue()).thenReturn(List.of(lock));

        List<String> violations = service.validate(
                Set.of(SpecialActivity.CATERING_CORONA_ROOM),
                BarLocation.HUBBLE,
                SeatingArea.OUTSIDE,
                LocalDate.now().plusDays(10),
                LocalTime.of(12, 0),
                20);

        assertEquals(1, violations.size());
    }

    @Test
    void validate_shouldDetectAdvanceBookingViolation() {
        FormConstraint advance = FormConstraint.builder()
                .constraintType(FormConstraintType.ADVANCE_BOOKING)
                .triggerActivity("EAT_CATERING")
                .numericValue(7)
                .message("Catering requires 7 days advance")
                .enabled(true)
                .build();

        when(constraintRepository.findByEnabledTrue()).thenReturn(List.of(advance));

        List<String> violations = service.validate(
                Set.of(SpecialActivity.EAT_CATERING),
                BarLocation.HUBBLE,
                SeatingArea.INSIDE,
                LocalDate.now().plusDays(3),
                LocalTime.of(12, 0),
                20);

        assertEquals(1, violations.size());
        assertTrue(violations.get(0).contains("7 days"));
    }

    @Test
    void validate_shouldPassAdvanceBookingWhenFarEnough() {
        FormConstraint advance = FormConstraint.builder()
                .constraintType(FormConstraintType.ADVANCE_BOOKING)
                .triggerActivity("EAT_CATERING")
                .numericValue(7)
                .message("Catering requires 7 days advance")
                .enabled(true)
                .build();

        when(constraintRepository.findByEnabledTrue()).thenReturn(List.of(advance));

        List<String> violations = service.validate(
                Set.of(SpecialActivity.EAT_CATERING),
                BarLocation.HUBBLE,
                SeatingArea.INSIDE,
                LocalDate.now().plusDays(10),
                LocalTime.of(12, 0),
                20);

        assertTrue(violations.isEmpty());
    }

    @Test
    void validate_shouldDetectGuestLimitViolation() {
        FormConstraint guestLimit = FormConstraint.builder()
                .constraintType(FormConstraintType.GUEST_LIMIT)
                .triggerActivity("EAT_A_LA_CARTE")
                .numericValue(15)
                .message("À la carte limited to 15 guests")
                .enabled(true)
                .build();

        when(constraintRepository.findByEnabledTrue()).thenReturn(List.of(guestLimit));

        List<String> violations = service.validate(
                Set.of(SpecialActivity.EAT_A_LA_CARTE),
                BarLocation.HUBBLE,
                SeatingArea.INSIDE,
                LocalDate.now().plusDays(5),
                LocalTime.of(12, 0),
                20);

        assertEquals(1, violations.size());
    }

    @Test
    void validate_shouldPassGuestLimitWhenUnder() {
        FormConstraint guestLimit = FormConstraint.builder()
                .constraintType(FormConstraintType.GUEST_LIMIT)
                .triggerActivity("EAT_A_LA_CARTE")
                .numericValue(15)
                .message("À la carte limited to 15 guests")
                .enabled(true)
                .build();

        when(constraintRepository.findByEnabledTrue()).thenReturn(List.of(guestLimit));

        List<String> violations = service.validate(
                Set.of(SpecialActivity.EAT_A_LA_CARTE),
                BarLocation.HUBBLE,
                SeatingArea.INSIDE,
                LocalDate.now().plusDays(5),
                LocalTime.of(12, 0),
                10);

        assertTrue(violations.isEmpty());
    }

    @Test
    void validate_shouldDetectBlockedPeriod() {
        LocalDate eventDate = LocalDate.now().plusDays(5);

        BlockedPeriod blocked = BlockedPeriod.builder()
                .startDate(eventDate.minusDays(1))
                .endDate(eventDate.plusDays(1))
                .reason("Maintenance")
                .publicMessage("Closed for maintenance")
                .enabled(true)
                .build();

        when(constraintRepository.findByEnabledTrue()).thenReturn(List.of());
        when(blockedPeriodRepository.findBlockingPeriods(eventDate, BarLocation.HUBBLE))
                .thenReturn(List.of(blocked));

        List<String> violations = service.validate(
                Set.of(SpecialActivity.GRADUATION),
                BarLocation.HUBBLE,
                SeatingArea.INSIDE,
                eventDate,
                LocalTime.of(14, 0),
                30);

        assertEquals(1, violations.size());
        assertTrue(violations.get(0).contains("maintenance"));
    }

    @Test
    void validate_shouldCollectMultipleViolations() {
        FormConstraint conflict = FormConstraint.builder()
                .constraintType(FormConstraintType.ACTIVITY_CONFLICT)
                .triggerActivity("EAT_CATERING")
                .targetValue("EAT_A_LA_CARTE")
                .message("Cannot combine catering and à la carte")
                .enabled(true)
                .build();

        FormConstraint advance = FormConstraint.builder()
                .constraintType(FormConstraintType.ADVANCE_BOOKING)
                .triggerActivity("EAT_CATERING")
                .numericValue(7)
                .message("Catering requires 7 days advance")
                .enabled(true)
                .build();

        when(constraintRepository.findByEnabledTrue()).thenReturn(List.of(conflict, advance));

        List<String> violations = service.validate(
                Set.of(SpecialActivity.EAT_CATERING, SpecialActivity.EAT_A_LA_CARTE),
                BarLocation.HUBBLE,
                SeatingArea.INSIDE,
                LocalDate.now().plusDays(2),
                LocalTime.of(12, 0),
                10);

        assertEquals(2, violations.size());
    }

    @Test
    void validate_shouldSkipDisabledConstraints() {
        // Disabled constraints are not returned by findByEnabledTrue,
        // so we just pass an empty list
        when(constraintRepository.findByEnabledTrue()).thenReturn(List.of());

        List<String> violations = service.validate(
                Set.of(SpecialActivity.EAT_CATERING, SpecialActivity.EAT_A_LA_CARTE),
                BarLocation.HUBBLE,
                SeatingArea.INSIDE,
                LocalDate.now().plusDays(10),
                LocalTime.of(12, 0),
                10);

        assertTrue(violations.isEmpty());
    }

    @Test
    void validate_shouldHandleNullActivities() {
        List<String> violations = service.validate(
                null,
                BarLocation.HUBBLE,
                SeatingArea.INSIDE,
                LocalDate.now().plusDays(5),
                LocalTime.of(14, 0),
                20);

        assertTrue(violations.isEmpty());
    }

    @Test
    void validate_shouldHandleEmptyActivities() {
        List<String> violations = service.validate(
                Set.of(),
                BarLocation.HUBBLE,
                SeatingArea.INSIDE,
                LocalDate.now().plusDays(5),
                LocalTime.of(14, 0),
                20);

        assertTrue(violations.isEmpty());
    }
}
