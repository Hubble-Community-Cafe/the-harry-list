# Quick API Reference

## Base URL
```
http://localhost:8080
```

## Authentication

**Public Endpoints (No Login Required):**
- `POST /api/public/reservations` - Submit a reservation
- `GET /api/options/*` - Get form options
- `GET /actuator/health` - Health check

**Staff Endpoints (Login Required):**
- All `/api/reservations/*` endpoints
- All `/api/admin/*` endpoints

**Staff Credentials:**
```
Username: admin
Password: admin
```

---

## Public Endpoints (No Login Required)

### Submit a Reservation
```http
POST /api/public/reservations
Content-Type: application/json

{
  "contactName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+31612345678",
  "eventTitle": "Test Event",
  "eventType": "BORREL",
  "organizerType": "ASSOCIATION",
  "expectedGuests": 50,
  "eventDate": "2026-03-15",
  "startTime": "16:00:00",
  "endTime": "22:00:00",
  "location": "HUBBLE",
  "paymentOption": "PIN",
  "termsAccepted": true
}
```

**Response:**
```json
{
  "confirmationNumber": 1,
  "eventTitle": "Test Event",
  "contactName": "John Doe",
  "email": "john@example.com",
  "message": "Your reservation request has been submitted successfully. We will review your request and contact you at john@example.com soon."
}
```

### Get Form Options
```http
GET /api/options/all
```

---

## Staff Endpoints (Login Required)

### Get All Reservations
```http
GET /api/reservations
Authorization: Basic admin:admin
```

### Get Single Reservation
```http
GET /api/reservations/1
Authorization: Basic admin:admin
```

### Update Reservation
```http
PUT /api/reservations/1
Authorization: Basic admin:admin
Content-Type: application/json
```

### Delete Reservation
```http
DELETE /api/reservations/1
Authorization: Basic admin:admin
```

### Update Status (Admin)
```http
PATCH /api/admin/reservations/1/status?status=CONFIRMED&confirmedBy=admin
Authorization: Basic admin:admin
```

---

## Valid Enum Values

### Event Types
- BORREL, LUNCH, ACTIVITY, GRADUATION, DINNER, PARTY, MEETING, OTHER

### Organizer Types
- ASSOCIATION, COMPANY, PRIVATE, UNIVERSITY, PHD, STUDENT, STAFF, OTHER

### Payment Options
- PIN, CASH, INVOICE, COST_CENTER, PREPAID

### Locations
- HUBBLE, METEOR

### Dietary Preferences
- NONE, VEGETARIAN, VEGAN, HALAL, GLUTEN_FREE, LACTOSE_FREE, NUT_ALLERGY, OTHER

### Reservation Status
- PENDING, CONFIRMED, REJECTED, CANCELLED, COMPLETED

## Date/Time Formats
- **Date**: `YYYY-MM-DD` (e.g., "2026-03-15")
- **Time**: `HH:mm:ss` (e.g., "16:00:00")

## Required Fields
- contactName
- email
- eventTitle
- eventType
- organizerType
- expectedGuests (must be positive)
- eventDate
- startTime
- endTime
- location
- paymentOption
- termsAccepted

