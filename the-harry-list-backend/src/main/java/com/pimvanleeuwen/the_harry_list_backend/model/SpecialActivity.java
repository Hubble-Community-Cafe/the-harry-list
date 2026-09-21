package com.pimvanleeuwen.the_harry_list_backend.model;

import java.util.Arrays;
import java.util.List;

/**
 * Special activities that can be selected for a reservation.
 * Replaces EventType - these drive constraints throughout the form.
 *
 * <p>A value can be retired by marking it non-selectable. It then disappears from the
 * form options but stays valid for reservations that already carry it, so history keeps
 * rendering in the admin panel, PDF day reports, ICS feeds and emails.
 */
public enum SpecialActivity {
    GRADUATION("Graduation / PhD Defense"),
    EAT_A_LA_CARTE("Eat a la carte"),
    EAT_CATERING("Eat catering"),
    CATERING_CORONA_ROOM("Catering Corona Room"),

    /** Retired in 1.12.0: guests kept misreading what a private event meant. */
    PRIVATE_EVENT("Private event", false);

    private final String displayName;
    private final boolean selectable;

    SpecialActivity(String displayName) {
        this(displayName, true);
    }

    SpecialActivity(String displayName, boolean selectable) {
        this.displayName = displayName;
        this.selectable = selectable;
    }

    public String getDisplayName() {
        return displayName;
    }

    /** Whether this activity can still be chosen on a new reservation. */
    public boolean isSelectable() {
        return selectable;
    }

    /** The activities offered by the public form and the admin panel, in declaration order. */
    public static List<SpecialActivity> selectableValues() {
        return Arrays.stream(values())
                .filter(SpecialActivity::isSelectable)
                .toList();
    }
}
