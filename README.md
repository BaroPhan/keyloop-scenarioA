# Unified Service Scheduler

Keyloop technical assessment - **Scenario A** (Ownership domain). A NestJS + TypeORM +
MySQL backend that books vehicle service appointments only when **both** a capable
**service bay** and a **qualified technician** are free for the entire service duration,
then persists a confirmed appointment record.

Phase 1 adds normalized capabilities, JWT auth, admin RBAC, Redis caching, advance booking
with availability watches, and email notifications. See [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)
for the full design and ERD. Planned Phase 2 (international scale, payments, distributed
locking) is documented in [FUTURE_IMPLEMENTATIONS.md](FUTURE_IMPLEMENTATIONS.md).

**Brief design (one page):** [BRIEF_SYSTEM_DESIGN.md](BRIEF_SYSTEM_DESIGN.md) · [PDF](docs/BRIEF_SYSTEM_DESIGN.pdf) · [HTML](docs/BRIEF_SYSTEM_DESIGN.html) (print or `npm run export:brief-pdf`)

## Requirements

- Node.js 18+ and npm
- Docker (MySQL + Redis + Mailpit) — or reachable MySQL 8 and Redis 7

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start MySQL, phpMyAdmin, Redis, and Mailpit
docker compose up -d
#    MySQL: localhost:3306 | phpMyAdmin: http://localhost:8080 | Mailpit UI: http://localhost:8025

# 3. Configure environment
cp .env.example .env

# 4. Seed reference + demo accounts (dealership, capabilities, bays, technicians,
#    services, a customer user, and an admin user)
npm run seed

# 5. Run the API (http://localhost:3000)
npm run start:dev
```

`DB_SYNCHRONIZE=true` (default) auto-creates the schema from the entities on startup. For
production, set `DB_SYNCHRONIZE=false` and use migrations (`npm run migration:generate`,
`npm run migration:run`).

### Seeded demo accounts

| Role | Email | Password |
|------|-------|----------|
| Customer | `jane@example.com` | `password123` |
| Admin (all privileges) | `admin@example.com` | `admin12345` |

## Core flow

```bash
# Register / login to get a JWT
curl -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"jane@example.com","password":"password123"}'

# Discover ids to book against
curl localhost:3000/dealerships
curl localhost:3000/service-types
curl localhost:3000/capabilities

# Find open slots for a future day
curl "localhost:3000/availability/slots?dealershipId=1&serviceTypeId=1&date=2030-07-02"

# Book an appointment (system assigns a free technician + bay, or returns 409)
curl -X POST localhost:3000/appointments \
  -H 'Content-Type: application/json' \
  -d '{
    "customerId": 1,
    "vehicleId": 1,
    "dealershipId": 1,
    "serviceTypeId": 1,
    "startTime": "2030-07-01T09:00:00Z"
  }'
```

## API

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Create a customer account. |
| `POST` | `/auth/login` | Customer login → JWT. |
| `POST` | `/auth/admin/login` | Admin login → JWT. |
| `GET` | `/auth/me` | Current authenticated principal (bearer token). |

### Appointments & availability

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/appointments` | Book; `201` with assigned technician+bay, or `409` if no availability. Must be a future time. |
| `GET` | `/appointments/:id` | Fetch one appointment. |
| `GET` | `/appointments?dealershipId=&from=&to=` | List/filter appointments. |
| `GET` | `/me/appointments` | Order history for the authenticated user (bearer token). |
| `POST` | `/appointments/:id/cancel` | Cancel own appointment (customer JWT); frees the technician and bay, notifies watchers. |
| `POST` | `/appointments/:id/reschedule` | Move to a new time atomically (same locking rules). |
| `GET` | `/availability?dealershipId=&serviceTypeId=&startTime=` | Probe availability for one start time. |
| `GET` | `/availability/slots?dealershipId=&serviceTypeId=&date=` | Enumerate open slots for a UTC day. |
| `POST` | `/availability/watches` | Watch for an open slot in a window; emailed when found (bearer token). |
| `GET` | `/availability/watches` | List your watches (bearer token). |
| `POST` | `/availability/watches/:id/cancel` | Cancel a watch (bearer token). |

### Reference & management

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/dealerships`, `/service-types`, `/capabilities`, `/customers` | Reference data (cached, public). |
| `GET` | `/dealerships/:id/service-bays`, `/dealerships/:id/technicians`, `/customers/:id/vehicles` | Reference data. |
| `GET` | `/appointments` | List appointments (public filter, or full list for admin with `VIEW_APPOINTMENTS`). |
| `POST` | `/capabilities` | Create a capability (`MANAGE_CAPABILITIES`). |
| `POST` | `/dealerships/:id/service-bays` | Add a bay (`MANAGE_BAYS`). |
| `POST` | `/dealerships/:id/technicians` | Add a technician (`MANAGE_TECHNICIANS`). |
| `GET` | `/health` | DB + Redis health probe. |
| `GET` | `/api/docs` | Swagger UI (interactive API documentation). |

Management endpoints require an admin bearer token (`POST /auth/admin/login`) whose admin's
group grants the required privilege(s); otherwise `403`. Routes are not prefixed with `/admin`.

### API testing

- **Swagger UI:** http://localhost:3000/api/docs (after `npm run start:dev`)
- **Postman:** import [postman/Unified-Service-Scheduler.postman_collection.json](postman/Unified-Service-Scheduler.postman_collection.json)
- **cURL reference:** [postman/API-CURL.md](postman/API-CURL.md)

## Tests

```bash
# Unit tests (pure availability + slot rules - no DB required)
npm test

# Integration / e2e tests (REQUIRE MySQL + Redis running via docker compose)
npm run test:e2e
```

The e2e suite covers successful booking (`201`), overlapping booking rejected (`409`),
back-to-back booking allowed, cancellation freeing a slot, and a **concurrent
double-booking** test asserting exactly one of two simultaneous requests for the only free
resource succeeds.

## Project layout

```
src/
  entities/                 # TypeORM entities (capabilities normalized, users/admins, watches, ...)
  appointments/             # core scheduling
    appointments.service.ts # booking transaction + pessimistic locks (READ COMMITTED + FOR UPDATE)
    availability.service.ts # qualification, capability, shift, overlap rules + slot enumeration
    availability-watch.service.ts
    dto/
  auth/                     # JWT auth, registration, guard
  admin/                    # RBAC: privileges, groups, guard, admin operations
  reference/                # read-only master-data endpoints (cached)
  cache/                    # Redis-backed cache service + keys
  redis/                    # shared ioredis client
  queue/                    # BullMQ queues (mail, availability-watch)
  notifications/            # mail + watch processors, SMTP, periodic sweep
  health/                   # health probe
  config/                   # shared TypeORM options
  database/                 # standalone DataSource + seed script
  migrations/               # TypeORM migrations
test/                       # e2e tests
FUTURE_IMPLEMENTATIONS.md   # Phase 2 design (not yet implemented)
```
