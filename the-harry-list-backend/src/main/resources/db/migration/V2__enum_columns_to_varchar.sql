-- Store every Java enum as VARCHAR instead of a native MariaDB ENUM.
--
-- A native ENUM lists its allowed values in the column definition, so each new Java enum constant
-- needed an ALTER TABLE, and forgetting one only failed at runtime ("Data truncated for column") on
-- the first insert with the new value. hibernate.type.prefer_native_enum_types=false keeps Hibernate
-- on VARCHAR from now on. Existing values are kept as they are; only the column type changes.
-- Lengths follow the entities (@Column length, or Hibernate's default of 255). The tables that were
-- created by hand (admin_user, audit_log, recurrence columns) were already VARCHAR.

ALTER TABLE `blocked_periods`
  MODIFY `location` varchar(20) DEFAULT NULL;

ALTER TABLE `calendar_appointments`
  MODIFY `location` varchar(20) NOT NULL;

ALTER TABLE `email_templates`
  MODIFY `template_type` varchar(50) NOT NULL;

ALTER TABLE `form_constraints`
  MODIFY `constraint_type` varchar(30) NOT NULL;

ALTER TABLE `reservation`
  MODIFY `invoice_type` varchar(255) DEFAULT NULL,
  MODIFY `location` varchar(255) DEFAULT NULL,
  MODIFY `payment_option` varchar(255) NOT NULL,
  MODIFY `seating_area` varchar(255) NOT NULL,
  MODIFY `status` varchar(255) NOT NULL;

ALTER TABLE `reservation_special_activities`
  MODIFY `special_activity` varchar(255) DEFAULT NULL;
