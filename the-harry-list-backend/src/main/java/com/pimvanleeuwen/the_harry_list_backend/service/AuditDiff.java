package com.pimvanleeuwen.the_harry_list_backend.service;

import com.pimvanleeuwen.the_harry_list_backend.dto.FieldChange;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Reflection-based helper that computes field-level diffs between two instances
 * of the same entity, for use in audit logging.
 */
public final class AuditDiff {

    private AuditDiff() {
    }

    /** Metadata fields that are never meaningful to audit. */
    public static final Set<String> DEFAULT_IGNORE = Set.of("id", "createdAt", "updatedAt");

    /**
     * Compare two objects of the same type using {@link #DEFAULT_IGNORE} and no
     * display-name overrides.
     */
    public static List<FieldChange> compare(Object before, Object after) {
        return compare(before, after, DEFAULT_IGNORE, Collections.emptyMap());
    }

    /**
     * Compare two objects of the same type, returning one {@link FieldChange} per
     * differing field.
     *
     * @param before       the prior state (null yields an empty result)
     * @param after        the new state (null yields an empty result)
     * @param ignore       field names to skip (e.g. metadata)
     * @param displayNames optional map of field name -&gt; human-friendly label
     */
    public static List<FieldChange> compare(Object before, Object after, Set<String> ignore,
                                            Map<String, String> displayNames) {
        List<FieldChange> changes = new ArrayList<>();
        if (before == null || after == null) {
            return changes;
        }

        Set<String> ignored = ignore != null ? ignore : Collections.emptySet();
        Map<String, String> labels = displayNames != null ? displayNames : Collections.emptyMap();

        for (Field field : collectFields(after.getClass())) {
            if (Modifier.isStatic(field.getModifiers()) || ignored.contains(field.getName())) {
                continue;
            }
            try {
                field.setAccessible(true);
                Object oldValue = field.get(before);
                Object newValue = field.get(after);
                if (!Objects.equals(oldValue, newValue)) {
                    String label = labels.getOrDefault(field.getName(), field.getName());
                    changes.add(new FieldChange(label, stringify(oldValue), stringify(newValue)));
                }
            } catch (Exception e) {
                // Skip fields we cannot read (e.g. IllegalAccessException, InaccessibleObjectException)
                // rather than failing the whole diff. Auditing must never break the caller.
            }
        }
        return changes;
    }

    private static List<Field> collectFields(Class<?> type) {
        List<Field> fields = new ArrayList<>();
        for (Class<?> c = type; c != null && c != Object.class; c = c.getSuperclass()) {
            Collections.addAll(fields, c.getDeclaredFields());
        }
        return fields;
    }

    private static String stringify(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
