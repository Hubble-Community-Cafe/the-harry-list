# Quick API Reference

A one-page overview. The complete, always up-to-date reference is Swagger UI, generated from the
code: `http://localhost:8080/swagger-ui/index.html` in development (disabled in production).

## Base URL
```
http://localhost:8080
```

---

## Authentication

**Public endpoints (no login):**
- `POST /api/public/reservations`: submit a reservation request
- `GET /api/public/altcha/challenge`: proof-of-work challenge the form solves before submitting
- `GET /api/options/*`: form options
- `GET /api/calendar/feed.ics` and `/api/calendar/staff-feed.ics`: calendar feeds, protected by their own `token` query parameter
- `GET /actuator/health`: health check

**Staff endpoints (Microsoft Entra ID login):** everything under `/api/admin/*` and `/api/reservations/*`. Send an Entra ID access token for this app:

```http
Authorization: Bearer <access token>
```

There are no usernames or passwords. To get a token for manual testing, sign in to the admin portal and copy the `Authorization` header of any request to this API from the browser's developer tools (Network tab). In Swagger UI, paste only the token under **Authorize**.

**Roles:** every staff endpoint needs one of three roles, where a higher role includes the lower ones: **VIEWER** (read), **EDITOR** (change reservations, blocked periods, appointments, attachments), **ADMIN** (users, email templates, form settings, audit log). Swagger UI lists the required role on each endpoint. When the backend runs with `ALLOWED_GROUP_ID`, the token must also belong to the staff group.

---

## Public Endpoints

### Submit a Reservation
```http
POST /api/public/reservations
Content-Type: application/json

{
  "altcha": "<solved ALTCHA payload>",
  "contactName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+31612345678",
  "organizationName": "Study Association",
  "eventTitle": "Summer Drinks",
  "description": "Drinks after the exams",
  "specialActivities": ["GRADUATION"],
  "expectedGuests": 50,
  "eventDate": "2026-03-15",
  "startTime": "16:00",
  "endTime": "22:00",
  "location": "HUBBLE",
  "seatingArea": "INSIDE",
  "paymentOption": "INDIVIDUAL",
  "termsAccepted": true
}
```

`altcha` is required when ALTCHA is enabled (production); get a challenge from `GET /api/public/altcha/challenge`.

When `paymentOption` is `INVOICE`, the invoice details are required too: `invoiceType`, plus `costCenter` for `TUE` and `FONTYS`, or `invoiceName` and `invoiceAddress` for `EXTERNAL`. `termsAccepted` must be `true`. The API enforces the same rules as the form and answers a missing detail with 400 and the field name, for example `{"error": "costCenter: Kostenplaats is required"}`.

**Response:**
```json
{
  "confirmationNumber": "A1B2C3",
  "eventTitle": "Summer Drinks",
  "contactName": "John Doe",
  "email": "john@example.com",
  "message": "Your reservation request has been submitted successfully. ..."
}
```

### Get Form Options
```http
GET /api/options/all
```
Also available separately: `/api/options/special-activities`, `/payment-options`, `/invoice-types`, `/locations`, `/seating-areas`, `/constraints` and `/blocked-periods`.

---

## Staff Endpoints (examples)

### Get All Reservations (VIEWER)
```http
GET /api/reservations
Authorization: Bearer <access token>
```

### Get Single Reservation (VIEWER)
```http
GET /api/reservations/1
Authorization: Bearer <access token>
```

### Update Reservation (EDITOR)
```http
PUT /api/reservations/1?sendEmail=false
Authorization: Bearer <access token>
Content-Type: application/json
```

### Delete Reservation (EDITOR)
```http
DELETE /api/reservations/1?sendEmail=false
Authorization: Bearer <access token>
```

### Update Status (EDITOR)
```http
PATCH /api/admin/reservations/1/status?status=CONFIRMED
Authorization: Bearer <access token>
```

---

## Valid Enum Values

### Locations
- HUBBLE, METEOR, NO_PREFERENCE

### Seating Areas
- INSIDE, OUTSIDE

### Payment Options
- INDIVIDUAL, ONE_PERSON, INVOICE

### Invoice Types
- TUE, FONTYS, EXTERNAL

### Special Activities
- GRADUATION, EAT_A_LA_CARTE, EAT_CATERING, CATERING_CORONA_ROOM
- `PRIVATE_EVENT` was retired in 1.12.0. It is no longer returned by `/api/options/*` and is rejected with a 400 on submission, but stays readable on reservations booked before then.

### Reservation Status
- PENDING, CONFIRMED, REJECTED, CANCELLED
- `COMPLETED` was removed in 1.12.0. `PATCH /api/admin/reservations/{id}/status?status=COMPLETED` now returns 400.

## Date/Time Formats
- **Date**: `YYYY-MM-DD` (e.g. "2026-03-15")
- **Time**: `HH:mm` or `HH:mm:ss` (e.g. "16:00")

## Required Fields (public submission)
- contactName
- email (a valid address)
- eventTitle
- description
- expectedGuests (must be positive)
- eventDate
- startTime
- endTime
- seatingArea
- paymentOption
- termsAccepted (must be `true`)
- invoiceType, and costCenter (TUE, FONTYS) or invoiceName and invoiceAddress (EXTERNAL), when paymentOption is INVOICE
- altcha (when ALTCHA is enabled)
