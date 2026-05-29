# RBAC Migration Guide

## Overview

This migration introduces Role-Based Access Control (RBAC) to the admin panel. Three roles are supported:

| Role | Access |
|------|--------|
| **ADMIN** | Full access including user management, email templates, and form settings |
| **EDITOR** | Can manage reservations, blocked periods, appointments, and attachments |
| **VIEWER** | Read-only access to all pages, can export data |

## Prerequisites

- MariaDB access to the production database
- The Azure Object IDs (OIDs) for existing admin users

## Step 1: Run SQL Migration

Execute the following SQL on the production MariaDB database **before** deploying the new backend. The production backend uses `ddl-auto=validate`, so the table must exist before the application starts.

```sql
-- Create the admin_user table
CREATE TABLE admin_user (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  azure_oid VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'VIEWER',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Pre-seed existing users so they experience no disruption
INSERT INTO admin_user (azure_oid, email, display_name, role) VALUES
  ('test_oid', 'test-mail', 'test-name', 'ADMIN')
```

## Step 2: Set Environment Variable

Set the `INITIAL_ADMIN_OID` environment variable on the backend service. This ensures that if the seeded data is ever lost, the first user to log in with this OID gets ADMIN role automatically.

```
INITIAL_ADMIN_OID=
```

## Step 3: Deploy

Deploy the new backend and admin frontend. The deployment order doesn't matter since:
- The SQL migration creates the table before the backend validates it
- The frontend gracefully handles the `/api/admin/users/me` endpoint (loading state while fetching role)

## Step 4: Verify

1. **ADMIN** logs in → sees Users page in nav, full admin access
2. **EDITOR** logs in → can manage reservations, blocked periods, appointments, attachments; cannot see Users, Email Templates (edit), or Form Settings (edit)
3. Test a viewer by logging in a new user role to VIEWER via the Users page → this should see all pages but all edit/create/delete buttons are hidden, and direct API calls to mutating endpoints return 403

## Step 5: Cleanup (Optional)

The `INITIAL_ADMIN_OID` env var can be removed after deployment. It only applies when a user with that OID logs in for the very first time and no record exists yet.

## Rollback

To roll back RBAC:

1. Deploy the previous backend version
2. The `admin_user` table can remain (it won't be used by the old backend)
3. To fully clean up: `DROP TABLE admin_user;`

## Notes

- The existing Azure AD group check (`ALLOWED_GROUP_ID`) still works as the first gate — RBAC is a second layer on top
- New users who log in after deployment are auto-created with VIEWER role
- Roles are hierarchical: ADMIN inherits all EDITOR permissions, EDITOR inherits all VIEWER permissions
