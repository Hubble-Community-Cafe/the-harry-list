# CoBo & In-Progress Migration Guide

## Overview

This migration covers two related changes:

1. A new **`IN_PROGRESS`** reservation status, so staff can mark a request as picked up. It is internal only — the customer is never emailed about it.
2. A new **`COBO`** special activity (CoBo / constitution drink), its own **CoBo mail**, and a **"CoBo Contract Signed"** bookkeeping flag.

The change is **additive and backwards compatible**: one new nullable-with-default column, and  two enum values that widen existing string columns' value sets. No existing table, row or API  contract changes. Existing reservations keep their status and behaviour.

## Step 1: Run SQL migration

Production runs with `ddl-auto=validate`, so the schema must be correct **before** the new  backend is deployed.

### 1a. Add the CoBo contract column (required)

```sql
ALTER TABLE reservation
  ADD COLUMN cobo_contract_signed BOOLEAN NOT NULL DEFAULT FALSE;
```

`false` for every existing row, which is correct, no reservation has a signed CoBo contract yet. This mirrors the existing `catering_arranged` column.

### 1b. Check the status column is wide enough (verify, then act)

The new `IN_PROGRESS` value is **11 characters**. Until now the longest status was `CONFIRMED` / `CANCELLED` / `COMPLETED` at **9**, and Hibernate sizes an unannotated `@Enumerated(STRING)` column to the longest constant. If the deployed column is narrower than 11, writing the new status fails or silently truncates.

Check first:

```sql
SHOW CREATE TABLE reservation;
```

Look at the `status` line. If it is anything narrower than `varchar(32)`, widen it:

```sql
ALTER TABLE reservation MODIFY COLUMN status VARCHAR(32) NOT NULL;
```

The entity now pins `length = 32` explicitly, so this cannot creep up on us again, a future  status name longer than 32 characters is caught by a unit test instead (`EnumTests#reservationStatus_namesFitThePersistedColumn`).

If the `SHOW CREATE TABLE` output contains a `CHECK` constraint enumerating the status values, drop and recreate it to include `IN_PROGRESS`, or drop it entirely, the application enforces the allowed values and transitions itself.

### 1c. No change needed for the new activity

`COBO` is written to `reservation_special_activities.special_activity`, which is sized for `CATERING_CORONA_ROOM` (20 characters). `COBO` is 4, so it fits. Likewise the new `COBO_OPTIONS` email template type fits the existing `email_templates.template_type` `VARCHAR(50)`.

Dev and E2E create everything automatically (`ddl-auto=update`), so no manual step is needed there.

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

The widened `status` column needs no rollback — it is compatible with the old code.

**Before rolling back**, note that any reservation left in `IN_PROGRESS` or holding the `COBO` activity will fail to load on the older backend, which cannot deserialize those values. Move  them out first:

```sql
UPDATE reservation SET status = 'PENDING' WHERE status = 'IN_PROGRESS';
DELETE FROM reservation_special_activities WHERE special_activity = 'COBO';
```
