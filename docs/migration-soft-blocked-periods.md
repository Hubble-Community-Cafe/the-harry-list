# Soft-Blocked Periods Migration Guide

## Overview

This migration adds a **soft block** option to blocked periods. A soft block keeps a
period marked and shows the customer a warning, but — unlike a normal (hard) block — it
does **not** prevent the booking. The customer must tick an acknowledgement checkbox to
continue. This is intended for situations such as a summer closing where the bar is closed
by default but opens on request of a reservation.

The change is **additive and backwards compatible**: it adds two nullable/defaulted columns
to the existing `blocked_periods` table. No existing tables, rows, or API contracts change —
existing blocked periods keep behaving as hard blocks (`soft_block = false`).

## Step 1: Run SQL Migration

The production backend runs with `ddl-auto=validate`, so the columns must exist **before**
deploying the new backend. Execute the following on the production MariaDB database:

```sql
ALTER TABLE blocked_periods
  ADD COLUMN soft_block BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN acknowledgement_text VARCHAR(500) NULL;
```

- `soft_block` — `false` (hard block) for all existing rows, preserving current behaviour.
- `acknowledgement_text` — optional checkbox label shown for a soft block; `NULL`/blank
  falls back to a sensible default message on the public form.

Dev and test environments create the columns automatically (`ddl-auto=update` / H2), so no
manual step is needed there.

## Step 2: Deploy

Deploy the new backend and frontends. Deployment order does not matter — the SQL migration
adds the columns before the backend validates the schema, and existing endpoints/payloads
remain valid (the new fields are optional in the API).

## Step 3: Verify

1. In the admin **Form Settings → Blocked Periods**, add or edit a period and enable
   **"Soft block (allow bookings with a warning)"**. Optionally set the acknowledgement text.
   The row shows an amber **"Soft block"** badge.
2. On the public reservation form, choose a date inside that period:
   - The public message appears as an amber warning with an **acknowledgement checkbox**.
   - **Continue** is blocked until the checkbox is ticked, then the booking proceeds.
3. Confirm a regular (hard) blocked period still fully blocks the date with a red notice and
   no checkbox.
4. Editing a period records the `softBlock` / `acknowledgementText` changes in the **audit log**.

## Rollback

The columns are additive and unused by older code. To roll back, redeploy the previous
backend; the extra columns can be left in place harmlessly, or dropped with:

```sql
ALTER TABLE blocked_periods
  DROP COLUMN soft_block,
  DROP COLUMN acknowledgement_text;
```
