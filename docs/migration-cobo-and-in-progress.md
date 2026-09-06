# CoBo & In-Progress Migration Guide

## Overview

This migration covers two related changes:

1. A new **`IN_PROGRESS`** reservation status, so staff can mark a request as picked up. It is internal only — the customer is never emailed about it.
2. A new **`COBO`** special activity (CoBo / constitution drink), its own **CoBo mail**, and a **"CoBo Contract Signed"** bookkeeping flag.

The change is **additive and backwards compatible** at the data level: one new column with a default, two new enum values, and three columns converted from native `ENUM` to `VARCHAR` without altering any stored value. No existing row or API contract changes, and existing reservations keep their status and behaviour.

**Do not skip step 1b.** The enum-to-varchar conversion is what makes the new status and activity writable at all; without it they fail at runtime, not at startup.

## Step 1: Run SQL migration

Production runs with `ddl-auto=validate`, so the schema must be correct **before** the new  backend is deployed.

### 1a. Add the CoBo contract column (required)

```sql
ALTER TABLE reservation
  ADD COLUMN cobo_contract_signed BOOLEAN NOT NULL DEFAULT FALSE;
```

`false` for every existing row, which is correct, no reservation has a signed CoBo contract yet. This mirrors the existing `catering_arranged` column.

### 1b. Convert the three enum columns to VARCHAR (required)

**This is the step that breaks things if skipped.** Hibernate 6.2+ maps `@Enumerated(EnumType.STRING)` to a **native MariaDB `ENUM(...)` column**, not a varchar. Writing a value that is not in the column's value list fails at runtime with `Data truncated for column '...' at row 1` — not at startup, so `validate` will not warn you.

Three columns are affected by this release, and all three are converted to plain varchar so that future statuses, activities and template types never need a schema change again:

```sql
ALTER TABLE reservation
  MODIFY COLUMN status VARCHAR(32) NOT NULL;

ALTER TABLE reservation_special_activities
  MODIFY COLUMN special_activity VARCHAR(50);

ALTER TABLE email_templates
  MODIFY COLUMN template_type VARCHAR(50) NOT NULL;
```

The conversion is **data-preserving**: MariaDB stores the enum labels as the same strings, so every existing row keeps its exact value. Check what you have first if you want to confirm the starting state:

```sql
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND COLUMN_NAME IN ('status', 'special_activity', 'template_type');
```

The entities now carry `@JdbcTypeCode(SqlTypes.VARCHAR)`, so Hibernate generates varchar for these columns from here on. This was verified by generating the schema from the entities against a scratch database: all three come out as `varchar`.

If `SHOW CREATE TABLE` reveals a `CHECK` constraint enumerating the values, drop it — the application enforces the allowed values and transitions itself.

**Note:** the other enum columns in the schema (audit log, form constraints, calendar appointments, blocked periods, admin roles, seating area, payment option, invoice type, location) are still native `ENUM`s. They are untouched by this release, but adding a value to any of them will hit the same failure. Worth converting them the same way when one of them next changes.

Dev and E2E create everything automatically (`ddl-auto=update`), so no manual step is needed there — with one caveat: `ddl-auto=update` does **not** add values to the enum column of an `@ElementCollection` table, so an existing dev database created before this release needs the `special_activity` statement above run by hand.

## Step 2: Deploy

Deploy the new backend and both frontends. Run the SQL first; after that, deployment order  does not matter — the new fields are optional in the API and older frontends degrade  gracefully (they fall back to a default badge for an unknown status).

## Step 3: Verify

1. Open a **pending** reservation in the admin. **Change Status** offers *In Progress*, and choosing it shows no email option. Confirm no mail is sent.
2. From **In Progress**, confirm the reservation — the customer receives the usual confirmation email.
3. Try an illegal move (e.g. a completed reservation) — the API rejects it with a 400 and the UI does not offer it.
4. On the public form, **CoBo (Constitution Drink)** is selectable, and a submitted CoBo reservation shows the activity in the admin.
5. On a CoBo reservation, **Send Mail → CoBo** renders the CoBo template with no attachments pre-ticked, and the **CoBo Contract Signed** toggle records a change in the audit log.
6. Confirm a CoBo reservation does **not** appear in the catering day report or the week overview's "catering needed" count.

## Rollback

The column is additive and unused by older code. To roll back, redeploy the previous backend; `cobo_contract_signed` can be left in place harmlessly, or dropped with:

```sql
ALTER TABLE reservation DROP COLUMN cobo_contract_signed;
```

The three varchar columns need no rollback — the old code reads and writes the same strings, and a varchar accepts everything the old `ENUM` did.

**Before rolling back**, note that any reservation left in `IN_PROGRESS` or holding the `COBO` activity will fail to load on the older backend, which cannot deserialize those values. Move  them out first:

```sql
UPDATE reservation SET status = 'PENDING' WHERE status = 'IN_PROGRESS';
DELETE FROM reservation_special_activities WHERE special_activity = 'COBO';
```
