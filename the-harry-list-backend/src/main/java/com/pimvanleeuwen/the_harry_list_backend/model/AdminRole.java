package com.pimvanleeuwen.the_harry_list_backend.model;

public enum AdminRole {
    VIEWER("Viewer"),
    EDITOR("Editor"),
    ADMIN("Admin");

    private final String displayName;

    AdminRole(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
