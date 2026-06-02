# API cURL Reference

Base URL: `http://localhost:3000`  
Swagger UI: `http://localhost:3000/api/docs`

After `npm run seed`, typical ids: `customerId=1`, `vehicleId=1`, `dealershipId=1`, `serviceTypeId=1` (oil change).

---

## Auth

```bash
# Register customer
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "newcustomer@example.com",
    "password": "password123",
    "name": "New Customer",
    "phone": "555-0199"
  }'

# Customer login (save accessToken)
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"jane@example.com","password":"password123"}'

# Admin login (save accessToken)
curl -X POST http://localhost:3000/auth/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin12345"}'

# Current principal
curl http://localhost:3000/auth/me \
  -H 'Authorization: Bearer YOUR_JWT_HERE'
```

---

## Reference

```bash
curl http://localhost:3000/dealerships
curl http://localhost:3000/service-types
curl http://localhost:3000/capabilities
curl http://localhost:3000/customers
curl http://localhost:3000/dealerships/1/service-bays
curl http://localhost:3000/dealerships/1/technicians
curl http://localhost:3000/customers/1/vehicles
```

---

## Availability

```bash
# Probe one start time
curl 'http://localhost:3000/availability?dealershipId=1&serviceTypeId=1&startTime=2030-07-01T09:00:00.000Z'

# Open slots for a UTC day
curl 'http://localhost:3000/availability/slots?dealershipId=1&serviceTypeId=1&date=2030-07-01'

# Create watch (customer JWT required)
curl -X POST http://localhost:3000/availability/watches \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer CUSTOMER_JWT' \
  -d '{
    "dealershipId": 1,
    "serviceTypeId": 1,
    "windowStart": "2030-07-01T08:00:00.000Z",
    "windowEnd": "2030-07-01T17:00:00.000Z"
  }'

curl http://localhost:3000/availability/watches \
  -H 'Authorization: Bearer CUSTOMER_JWT'

curl -X POST http://localhost:3000/availability/watches/1/cancel \
  -H 'Authorization: Bearer CUSTOMER_JWT'
```

---

## Appointments

```bash
# Book (future startTime required)
curl -X POST http://localhost:3000/appointments \
  -H 'Content-Type: application/json' \
  -d '{
    "customerId": 1,
    "vehicleId": 1,
    "dealershipId": 1,
    "serviceTypeId": 1,
    "startTime": "2030-07-01T09:00:00.000Z"
  }'

curl http://localhost:3000/appointments/1
curl 'http://localhost:3000/appointments?dealershipId=1'

curl http://localhost:3000/me/appointments \
  -H 'Authorization: Bearer CUSTOMER_JWT'

curl -X POST http://localhost:3000/appointments/1/cancel \
  -H 'Authorization: Bearer CUSTOMER_JWT'

curl -X POST http://localhost:3000/appointments/1/reschedule \
  -H 'Content-Type: application/json' \
  -d '{"startTime":"2030-07-01T10:00:00.000Z"}'
```

---

## Admin (admin JWT + privileges required)

```bash
curl http://localhost:3000/appointments \
  -H 'Authorization: Bearer ADMIN_JWT'

curl -X POST http://localhost:3000/capabilities \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ADMIN_JWT' \
  -d '{
    "code": "PAINT_BOOTH",
    "name": "Paint Booth",
    "description": "Spray paint booth"
  }'

curl -X POST http://localhost:3000/dealerships/1/service-bays \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ADMIN_JWT' \
  -d '{"name":"Bay 3","capabilityIds":[1]}'

curl -X POST http://localhost:3000/dealerships/1/technicians \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ADMIN_JWT' \
  -d '{
    "name": "Carol (trainee)",
    "skillIds": [1],
    "shiftStartMinutes": 480,
    "shiftEndMinutes": 1020
  }'
```

---

## Health

```bash
curl http://localhost:3000/health
```

---

## Postman

Import `postman/Unified-Service-Scheduler.postman_collection.json`.  
Run **Customer Login** or **Admin Login** first — tokens are saved to collection variables automatically.
