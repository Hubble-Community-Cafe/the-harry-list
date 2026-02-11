package com.pimvanleeuwen.the_harry_list_backend.model;

/**
 * Dietary preferences / food options for the event.
 */
public enum DietaryPreference {
    NONE("No special requirements"),
    VEGETARIAN("Vegetarian"),
    VEGAN("Vegan"),
    HALAL("Halal"),
    GLUTEN_FREE("Gluten-free"),
    LACTOSE_FREE("Lactose-free"),
    NUT_ALLERGY("Nut allergy"),
    OTHER("Other (specify in comments)");

    private final String displayName;

    DietaryPreference(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}

