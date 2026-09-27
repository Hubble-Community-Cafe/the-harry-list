-- Baseline: the production schema as of 2026-09-27 (v1.12.x), taken from a structure-only export of
-- the live database. It includes the manual migrations that used to live in docs/ (RBAC, audit log,
-- soft-blocked periods) and whatever Hibernate's former ddl-auto=update created, types and all.
--
-- Production itself never runs this file: it already has these tables, so Flyway marks it as V1
-- (spring.flyway.baseline-on-migrate). It builds new databases: e2e, local development, new setups.
-- Do not edit it; every change goes in a new V<n>__description.sql.

CREATE TABLE `admin_user` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `azure_oid` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `display_name` varchar(255) DEFAULT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'VIEWER',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `azure_oid` (`azure_oid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `audit_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(40) NOT NULL,
  `entity_id` bigint(20) DEFAULT NULL,
  `entity_label` varchar(255) DEFAULT NULL,
  `ACTION` varchar(30) NOT NULL,
  `actor_oid` varchar(255) DEFAULT NULL,
  `actor_email` varchar(255) DEFAULT NULL,
  `actor_name` varchar(255) DEFAULT NULL,
  `changes` text DEFAULT NULL,
  `summary` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  KEY `idx_audit_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `blocked_periods` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `enabled` bit(1) NOT NULL,
  `end_date` date NOT NULL,
  `end_time` time DEFAULT NULL,
  `location` enum('HUBBLE','METEOR','NO_PREFERENCE') DEFAULT NULL,
  `public_message` varchar(500) DEFAULT NULL,
  `reason` varchar(500) NOT NULL,
  `start_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `soft_block` tinyint(1) NOT NULL DEFAULT 0,
  `acknowledgement_text` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `calendar_appointments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `all_day` bit(1) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `event_date` date NOT NULL,
  `description` text DEFAULT NULL,
  `enabled` bit(1) NOT NULL,
  `end_time` time DEFAULT NULL,
  `location` enum('HUBBLE','METEOR','NO_PREFERENCE') NOT NULL,
  `recurrence_end_date` date DEFAULT NULL,
  `recurrence_type` varchar(30) NOT NULL,
  `start_time` time DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `recurrence_interval` int(11) DEFAULT NULL,
  `recurrence_week_of_month` int(11) DEFAULT NULL,
  `recurrence_day_of_week` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `email_attachments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `active` bit(1) NOT NULL,
  `content_type` varchar(255) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `data` longblob NOT NULL,
  `filename` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `email_templates` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `body_template` text NOT NULL,
  `subject` varchar(255) NOT NULL,
  `template_type` enum('CANCELLED','CATERING_OPTIONS','STAFF_NOTIFICATION','STATUS_CHANGED','SUBMITTED','UPDATED') NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK2v1sv0bn0w38jurljirbd3i58` (`template_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `form_constraints` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `constraint_type` enum('ACTIVITY_CONFLICT','LOCATION_LOCK','SEATING_LOCK','TIME_RESTRICTION','ADVANCE_BOOKING','GUEST_LIMIT','GUEST_MINIMUM','ACTIVITY_NOTICE') NOT NULL,
  `enabled` bit(1) NOT NULL,
  `message` varchar(500) NOT NULL,
  `numeric_value` int(11) DEFAULT NULL,
  `secondary_value` varchar(100) DEFAULT NULL,
  `target_value` varchar(50) DEFAULT NULL,
  `trigger_activity` varchar(30) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `reservation` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `catering_arranged` bit(1) NOT NULL,
  `catering_dietary_notes` text DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `confirmation_number` varchar(6) NOT NULL,
  `confirmed_by` varchar(255) DEFAULT NULL,
  `contact_name` varchar(255) NOT NULL,
  `cost_center` varchar(100) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `description` text NOT NULL,
  `email` varchar(255) NOT NULL,
  `end_time` time NOT NULL,
  `event_date` date NOT NULL,
  `event_title` varchar(255) NOT NULL,
  `expected_guests` int(11) DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `invoice_address` varchar(500) DEFAULT NULL,
  `invoice_name` varchar(255) DEFAULT NULL,
  `invoice_remarks` text DEFAULT NULL,
  `invoice_type` enum('EXTERNAL','FONTYS','TUE') DEFAULT NULL,
  `location` enum('HUBBLE','METEOR','NO_PREFERENCE') DEFAULT NULL,
  `long_reservation_reason` text DEFAULT NULL,
  `organization_name` varchar(255) DEFAULT NULL,
  `payment_option` enum('INDIVIDUAL','INVOICE','ONE_PERSON') NOT NULL,
  `phone_number` varchar(50) DEFAULT NULL,
  `seating_area` enum('INSIDE','OUTSIDE') NOT NULL,
  `start_time` time NOT NULL,
  `status` enum('CANCELLED','COMPLETED','CONFIRMED','PENDING','REJECTED') NOT NULL,
  `terms_accepted` bit(1) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKpj4v93n6jc1uvnrvykuc82m89` (`confirmation_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `reservation_special_activities` (
  `reservation_id` bigint(20) NOT NULL,
  `special_activity` enum('CATERING_CORONA_ROOM','EAT_A_LA_CARTE','EAT_CATERING','GRADUATION','PRIVATE_EVENT') DEFAULT NULL,
  KEY `FKkofd1tnsl317mshigf9siwbrs` (`reservation_id`),
  CONSTRAINT `FKkofd1tnsl317mshigf9siwbrs` FOREIGN KEY (`reservation_id`) REFERENCES `reservation` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
