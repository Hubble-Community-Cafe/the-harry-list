# Postman Testing Guide for The Harry List API

## Quick Start

### 1. Start the Application

```bash
# Option 1: Using Docker Compose (local development)
cd the-harry-list
docker-compose up -d

# Option 2: Using Maven directly
cd the-harry-list-backend
./mvnw spring-boot:run
```

The API will be available at: **http://localhost:8080**

### 2. Import Postman Collection

1. Open Postman
2. Click **Import** (top left)
3. Select the file: `The-Harry-List-API.postman_collection.json`
4. Click **Import**

### 3. Verify Setup

Test the health check endpoint:
- **Request**: GET `http://localhost:8080/actuator/health`
- **Expected Response**: 
  ```json
  {"status":"UP"}
  ```

---

## Authentication

All API endpoints (except `/actuator/health` and `/api/options/*`) require **HTTP Basic Authentication**.

**Default Credentials:**
- **Username**: `admin`
- **Password**: `admin`

The Postman collection is pre-configured with these credentials.

---

## API Endpoints Overview

### Public Endpoints (No Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/actuator/health` | GET | Health check |
| `/api/options/all` | GET | Get all form options |
| `/api/options/event-types` | GET | Get event types |
| `/api/options/organizer-types` | GET | Get organizer types |
| `/api/options/payment-options` | GET | Get payment options |
| `/api/options/locations` | GET | Get bar locations |
| `/api/options/dietary-preferences` | GET | Get dietary preferences |

### Reservation Endpoints (Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reservations` | GET | Get all reservations |
| `/api/reservations/{id}` | GET | Get reservation by ID |
| `/api/reservations` | POST | Create new reservation |
| `/api/reservations/{id}` | PUT | Update reservation |
| `/api/reservations/{id}` | DELETE | Delete reservation |

### Admin Endpoints (Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/reservations/{id}/status` | PATCH | Update reservation status |
| `/api/admin/reservations/{id}/notes` | PATCH | Update internal notes |

---

## Testing Workflow

### Step 1: Get Form Options

Before creating a reservation, fetch the available options:

**Request:**
```
GET http://localhost:8080/api/options/all
```

**Response Example:**
```json
{
  "eventTypes": [
    {"value": "BORREL", "label": "Borrel / Drinks"},
    {"value": "LUNCH", "label": "Lunch"},
    {"value": "DINNER", "label": "Dinner"}
  ],
  "organizerTypes": [
    {"value": "ASSOCIATION", "label": "Association / Study Association"},
    {"value": "COMPANY", "label": "Company / Business"}
  ],
  "paymentOptions": [
    {"value": "PIN", "label": "PIN / Card payment on site"},
    {"value": "INVOICE", "label": "Invoice afterwards"}
  ],
  "locations": [
    {"value": "HUBBLE", "label": "Hubble Community Café"},
    {"value": "METEOR", "label": "Meteor Community Café"}
  ],
  "dietaryPreferences": [
    {"value": "NONE", "label": "No special requirements"},
    {"value": "VEGETARIAN", "label": "Vegetarian"}
  ]
}
```

### Step 2: Create a Reservation

**Request:**
```
POST http://localhost:8080/api/reservations
Content-Type: application/json
Authorization: Basic admin:admin
```

**Minimal Request Body:**
```json
{
  "contactName": "John Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+31612345678",
  "eventTitle": "Annual Borrel",
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

**Full Request Body (All Fields):**
```json
{
  "contactName": "Jane Smith",
  "email": "jane.smith@company.com",
  "phoneNumber": "+31687654321",
  "organizationName": "Tech Company B.V.",
  "eventTitle": "Company Dinner 2026",
  "description": "End of year dinner with the entire team",
  "eventType": "DINNER",
  "organizerType": "COMPANY",
  "expectedGuests": 30,
  "eventDate": "2026-12-20",
  "startTime": "18:00:00",
  "endTime": "23:00:00",
  "setupTimeMinutes": 30,
  "location": "METEOR",
  "specificArea": "Private dining area",
  "paymentOption": "INVOICE",
  "invoiceName": "Tech Company B.V.",
  "invoiceAddress": "123 Main Street, 5600 AB Eindhoven",
  "vatNumber": "NL123456789B01",
  "foodRequired": true,
  "dietaryPreference": "VEGETARIAN",
  "dietaryNotes": "2 guests with nut allergies",
  "drinksIncluded": true,
  "budgetPerPerson": 45.50,
  "comments": "Please reserve the upstairs area if possible",
  "termsAccepted": true,
  "referralSource": "Website"
}
```

**Success Response (201 Created):**
```json
{
  "id": 1,
  "contactName": "John Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+31612345678",
  "eventTitle": "Annual Borrel",
  "eventType": "BORREL",
  "organizerType": "ASSOCIATION",
  "expectedGuests": 50,
  "eventDate": "2026-03-15",
  "startTime": "16:00:00",
  "endTime": "22:00:00",
  "location": "HUBBLE",
  "paymentOption": "PIN",
  "status": "PENDING",
  "createdAt": "2026-02-11T14:30:00",
  "updatedAt": "2026-02-11T14:30:00"
}
```

### Step 3: Get All Reservations

**Request:**
```
GET http://localhost:8080/api/reservations
Authorization: Basic admin:admin
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "contactName": "John Doe",
    "email": "john.doe@example.com",
    "eventTitle": "Annual Borrel",
    "status": "PENDING",
    "eventDate": "2026-03-15",
    "location": "HUBBLE"
  }
]
```

### Step 4: Get Single Reservation

**Request:**
```
GET http://localhost:8080/api/reservations/1
Authorization: Basic admin:admin
```

**Response (200 OK):**
```json
{
  "id": 1,
  "contactName": "John Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+31612345678",
  "eventTitle": "Annual Borrel",
  "eventType": "BORREL",
  "organizerType": "ASSOCIATION",
  "expectedGuests": 50,
  "eventDate": "2026-03-15",
  "startTime": "16:00:00",
  "endTime": "22:00:00",
  "location": "HUBBLE",
  "paymentOption": "PIN",
  "status": "PENDING",
  "createdAt": "2026-02-11T14:30:00",
  "updatedAt": "2026-02-11T14:30:00"
}
```

### Step 5: Update Reservation

**Request:**
```
PUT http://localhost:8080/api/reservations/1
Content-Type: application/json
Authorization: Basic admin:admin
```

**Request Body:**
```json
{
  "contactName": "John Doe Updated",
  "email": "john.doe@example.com",
  "phoneNumber": "+31612345678",
  "eventTitle": "Annual Borrel - Updated",
  "eventType": "BORREL",
  "organizerType": "ASSOCIATION",
  "expectedGuests": 60,
  "eventDate": "2026-03-15",
  "startTime": "17:00:00",
  "endTime": "23:00:00",
  "location": "HUBBLE",
  "paymentOption": "INVOICE",
  "termsAccepted": true
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "contactName": "John Doe Updated",
  "expectedGuests": 60,
  "startTime": "17:00:00",
  "endTime": "23:00:00",
  "paymentOption": "INVOICE",
  "status": "PENDING",
  "updatedAt": "2026-02-11T14:35:00"
}
```

### Step 6: Update Reservation Status (Admin)

**Request:**
```
PATCH http://localhost:8080/api/admin/reservations/1/status?status=CONFIRMED&confirmedBy=admin
Authorization: Basic admin:admin
```

**Status Options:**
- `PENDING`
- `CONFIRMED`
- `REJECTED`
- `CANCELLED`
- `COMPLETED`

**Response (200 OK):**
```json
{
  "id": 1,
  "contactName": "John Doe Updated",
  "status": "CONFIRMED",
  "updatedAt": "2026-02-11T14:40:00"
}
```

### Step 7: Add Internal Notes (Admin)

**Request:**
```
PATCH http://localhost:8080/api/admin/reservations/1/notes
Content-Type: text/plain
Authorization: Basic admin:admin
```

**Request Body:**
```
Customer called to confirm special dietary requirements. Table reserved upstairs.
```

**Response (200 OK):**
```json
{
  "id": 1,
  "contactName": "John Doe Updated",
  "status": "CONFIRMED"
}
```

### Step 8: Delete Reservation

**Request:**
```
DELETE http://localhost:8080/api/reservations/1
Authorization: Basic admin:admin
```

**Response (204 No Content)**
- No response body

---

## Validation Testing

### Test Invalid Data

**Missing Required Fields:**
```json
{
  "contactName": "John Doe"
}
```
**Expected Response (400 Bad Request):**
```json
{
  "timestamp": "2026-02-11T14:45:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "errors": [
    "Email is required",
    "Event title is required",
    "Event type is required"
  ]
}
```

**Invalid Email:**
```json
{
  "email": "invalid-email",
  "contactName": "John Doe",
  "eventTitle": "Test"
}
```
**Expected Response (400 Bad Request):**
```json
{
  "errors": [
    "Must be a valid email address"
  ]
}
```

**Invalid Enum Value:**
```json
{
  "eventType": "INVALID_TYPE"
}
```
**Expected Response (400 Bad Request):**
```json
{
  "error": "Invalid value for eventType"
}
```

---

## Error Responses

| Status Code | Description | Example |
|-------------|-------------|---------|
| 200 OK | Successful GET/PUT/PATCH | Request succeeded |
| 201 Created | Successful POST | Reservation created |
| 204 No Content | Successful DELETE | Reservation deleted |
| 400 Bad Request | Validation error | Invalid data |
| 401 Unauthorized | Missing/invalid credentials | Wrong password |
| 404 Not Found | Resource not found | Reservation ID doesn't exist |
| 500 Internal Server Error | Server error | Database error |

---

## Advanced Testing Scenarios

### Scenario 1: Complete Reservation Flow
1. Get form options
2. Create reservation (status: PENDING)
3. Get reservation by ID
4. Admin confirms reservation
5. Admin adds internal notes
6. Customer updates guest count
7. Event completed - admin marks as COMPLETED

### Scenario 2: Cancellation Flow
1. Create reservation
2. Customer requests cancellation
3. Admin marks as CANCELLED
4. Optionally delete reservation

### Scenario 3: Multiple Reservations
1. Create reservation for HUBBLE
2. Create reservation for METEOR
3. Get all reservations
4. Filter by location (manual)
5. Update specific reservation
6. Delete one reservation

---

## Testing with cURL (Alternative to Postman)

### Health Check
```bash
curl http://localhost:8080/actuator/health
```

### Get All Reservations
```bash
curl -u admin:admin http://localhost:8080/api/reservations
```

### Create Reservation
```bash
curl -u admin:admin -X POST \
  http://localhost:8080/api/reservations \
  -H 'Content-Type: application/json' \
  -d '{
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
  }'
```

### Update Status
```bash
curl -u admin:admin -X PATCH \
  "http://localhost:8080/api/admin/reservations/1/status?status=CONFIRMED&confirmedBy=admin"
```

### Delete Reservation
```bash
curl -u admin:admin -X DELETE \
  http://localhost:8080/api/reservations/1
```

---

## Swagger UI (Alternative Testing Method)

Access the interactive API documentation:

**URL**: http://localhost:8080/swagger-ui/index.html

1. Click **Authorize** button
2. Enter username: `admin`, password: `admin`
3. Click **Authorize**
4. Test endpoints directly in the browser

---

## Tips & Best Practices

1. **Save Responses**: Use Postman's "Save Response" feature to compare results
2. **Use Variables**: The collection uses `{{base_url}}` - you can change this for different environments
3. **Test Validation**: Always test with invalid data to ensure proper error handling
4. **Check Status**: Monitor reservation status changes through the workflow
5. **Use Collections**: Organize requests by feature (Create, Read, Update, Delete)
6. **Test Edge Cases**: Try extreme values, empty strings, very long text
7. **Performance**: Use Postman Runner to test multiple requests in sequence

---

## Troubleshooting

### Cannot Connect
- ✅ Verify application is running: `docker ps` or check process
- ✅ Check correct port (8080 for local, 9802 for Portainer)
- ✅ Verify no firewall blocking

### 401 Unauthorized
- ✅ Check credentials (admin:admin)
- ✅ Ensure Basic Auth is enabled in Postman
- ✅ Check Authorization header is being sent

### 400 Bad Request
- ✅ Verify JSON syntax is correct
- ✅ Check all required fields are present
- ✅ Validate enum values match exactly (case-sensitive)
- ✅ Check date format: `YYYY-MM-DD`
- ✅ Check time format: `HH:mm:ss`

### 404 Not Found
- ✅ Verify reservation ID exists
- ✅ Check URL path is correct
- ✅ Ensure reservation wasn't deleted

---

## Next Steps

1. Import the Postman collection
2. Start the application
3. Run the "Health Check" request
4. Try "Get All Form Options"
5. Create your first reservation
6. Experiment with the admin endpoints

Happy testing! 🎉

