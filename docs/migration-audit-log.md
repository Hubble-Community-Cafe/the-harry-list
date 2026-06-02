# Audit Log Migration Guide

## Overview

This migration introduces a persistent **audit log** that records who changed what (and when) across admin-managed entities — starting with reservations. Each entry captures the actor (from their Microsoft login), the action, and field-level diffs (old → new), and stays readable even after the underlying record is deleted.

The change is **additive and backwards compatible**: it creates one new table (`audit_log`) and adds new read-only endpoints. No existing tables or API contracts change.

## Step 1: Run SQL Migration

The production backend runs with `ddl-auto=validate`, so the table must exist **before** deploying the new backend. Execute the following on the production MariaDB database:

```sql
CREATE TABLE audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(40) NOT NULL,
  entity_id BIGINT,
  entity_label VARCHAR(255),
  action VARCHAR(30) NOT NULL,
  actor_oid VARCHAR(255),
  actor_email VARCHAR(255),
  actor_name VARCHAR(255),
  changes TEXT,
  summary VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_created_at (created_at)
);
```

Dev and test environments create the table automatically (`ddl-auto=update` / H2), so no manual step is needed there.

## Step 2: Deploy

Deploy the new backend (and, in later phases, the admin frontend). Deployment order does not matter — the SQL migration creates the table before the backend validates the schema, and existing endpoints are unaffected.

## Step 3: Verify

1. Edit a reservation (e.g. change the number of guests and confirm it) → a row appears in `audit_log` with `entity_type = 'RESERVATION'`, your email/name, and a `changes` JSON array.
2. `GET /api/admin/audit` as an ADMIN returns the entry; as an EDITOR/VIEWER it returns `403`.
3. `GET /api/admin/audit/reservation/{id}` returns that reservation's history for any authenticated user.
4. Delete a reservation → a `DELETE` entry remains, with the human-readable `entity_label` preserved.

## Rollback

1. Deploy the previous backend version.
2. The `audit_log` table can remain (the old backend ignores it).
3. To fully clean up: `DROP TABLE audit_log;`

## Notes

- Audit writes are best-effort: a failure to record an entry is logged but never breaks the underlying operation.
- Internal-note content is intentionally **not** stored in the audit log (only the fact that notes were updated), since notes may be long or sensitive.
- No retention/auto-purge is applied to audit rows in this release.
