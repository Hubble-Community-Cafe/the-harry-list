package com.pimvanleeuwen.the_harry_list_backend.config;

import com.pimvanleeuwen.the_harry_list_backend.model.FormConstraint;
import com.pimvanleeuwen.the_harry_list_backend.model.FormConstraintType;
import com.pimvanleeuwen.the_harry_list_backend.repository.FormConstraintRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Seeds default form constraints on first startup (all profiles).
 * Only runs when the form_constraints table is empty.
 * Staff can modify or disable these via the admin panel.
 */
@Component
@Order(1)
public class DefaultConstraintSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DefaultConstraintSeeder.class);

    private final FormConstraintRepository formConstraintRepository;

    public DefaultConstraintSeeder(FormConstraintRepository formConstraintRepository) {
        this.formConstraintRepository = formConstraintRepository;
    }

    @Override
    public void run(String... args) {
        if (formConstraintRepository.count() > 0) {
            logger.info("Form constraints already exist, skipping default seed");
            return;
        }

        // Activity conflicts
        formConstraintRepository.save(FormConstraint.builder()
                .constraintType(FormConstraintType.ACTIVITY_CONFLICT)
                .triggerActivity("EAT_CATERING")
                .targetValue("EAT_A_LA_CARTE")
                .message("Catering and à la carte dining cannot be combined")
                .build());

        formConstraintRepository.save(FormConstraint.builder()
                .constraintType(FormConstraintType.ACTIVITY_CONFLICT)
                .triggerActivity("EAT_A_LA_CARTE")
                .targetValue("EAT_CATERING")
                .message("À la carte and catering cannot be combined")
                .build());

        formConstraintRepository.save(FormConstraint.builder()
                .constraintType(FormConstraintType.ACTIVITY_CONFLICT)
                .triggerActivity("PRIVATE_EVENT")
                .targetValue("CATERING_CORONA_ROOM")
                .message("Private events cannot be combined with Corona Room catering")
                .build());

        formConstraintRepository.save(FormConstraint.builder()
                .constraintType(FormConstraintType.ACTIVITY_CONFLICT)
                .triggerActivity("CATERING_CORONA_ROOM")
                .targetValue("PRIVATE_EVENT")
                .message("Corona Room catering cannot be combined with a private event")
                .build());

        // Location locks
        formConstraintRepository.save(FormConstraint.builder()
                .constraintType(FormConstraintType.LOCATION_LOCK)
                .triggerActivity("CATERING_CORONA_ROOM")
                .targetValue("HUBBLE")
                .message("Corona Room catering is only available at Hubble")
                .build());

        formConstraintRepository.save(FormConstraint.builder()
                .constraintType(FormConstraintType.LOCATION_LOCK)
                .triggerActivity("PRIVATE_EVENT")
                .targetValue("METEOR")
                .message("Private events are only available at Meteor")
                .build());

        // Seating locks
        formConstraintRepository.save(FormConstraint.builder()
                .constraintType(FormConstraintType.SEATING_LOCK)
                .triggerActivity("CATERING_CORONA_ROOM")
                .targetValue("INSIDE")
                .message("Corona Room catering requires inside seating")
                .build());

        // Time restrictions
        formConstraintRepository.save(FormConstraint.builder()
                .constraintType(FormConstraintType.TIME_RESTRICTION)
                .triggerActivity("CATERING_CORONA_ROOM")
                .targetValue("EARLY_ACCESS")
                .secondaryValue("09:00-10:45")
                .message("Early time slots (before 11:00) are only available for Corona Room catering")
                .build());

        // Advance booking requirements
        formConstraintRepository.save(FormConstraint.builder()
                .constraintType(FormConstraintType.ADVANCE_BOOKING)
                .triggerActivity("EAT_CATERING")
                .numericValue(7)
                .message("Catering requires at least 7 days advance booking")
                .build());

        formConstraintRepository.save(FormConstraint.builder()
                .constraintType(FormConstraintType.ADVANCE_BOOKING)
                .triggerActivity("CATERING_CORONA_ROOM")
                .numericValue(7)
                .message("Corona Room catering requires at least 7 days advance booking")
                .build());

        formConstraintRepository.save(FormConstraint.builder()
                .constraintType(FormConstraintType.ADVANCE_BOOKING)
                .triggerActivity("PRIVATE_EVENT")
                .numericValue(7)
                .message("Private events require at least 7 days advance booking")
                .build());

        // Guest limits
        formConstraintRepository.save(FormConstraint.builder()
                .constraintType(FormConstraintType.GUEST_LIMIT)
                .triggerActivity("EAT_A_LA_CARTE")
                .numericValue(15)
                .message("À la carte dining is limited to 15 guests. For larger groups, please choose catering.")
                .build());

        logger.info("Seeded 12 default form constraints");
    }
}
