# Unified Service Scheduler

Keyloop technical assessment - **Scenario A** (Ownership domain). A NestJS + TypeORM +
MySQL backend that books vehicle service appointments only when **both** a capable
**service bay** and a **qualified technician** are free for the entire service duration,
then persists a confirmed appointment record.

See [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) for the design, assumptions, data model, and the
concurrency strategy.

## Requirements

- Node.js 18+ and npm
- Docker (for the MySQL instance) — or any reachable MySQL 8

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start MySQL
docker compose up -d

# 3. Configure environment
cp .env.example .env

# 4. Seed reference data (dealership, bays, technicians, services, a customer + vehicle)
npm run seed

# 5. Run the API (http://localhost:3000)
npm run start:dev
```

`DB_SYNCHRONIZE=true` (default) auto-creates the schema from the entities on startup.
Use migrations instead of synchronize for production.

## Core flow

```bash
# Discover ids to book against
curl localhost:3000/dealerships
curl localhost:3000/service-types
curl localhost:3000/customers

# Book an appointment (system assigns a free technician + bay, or returns 409)
curl -X POST localhost:3000/appointments \
  -H 'Content-Type: application/json' \
  -d '{
    "customerId": 1,
    "vehicleId": 1,
    "dealershipId": 1,
    "serviceTypeId": 1,
    "startTime": "2026-06-01T09:00:00Z"
  }'
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/appointments` | Book; `201` with assigned technician+bay, or `409` if no availability. |
| `GET` | `/appointments/:id` | Fetch one appointment. |
| `GET` | `/appointments?dealershipId=&from=&to=` | List/filter appointments. |
| `POST` | `/appointments/:id/cancel` | Cancel; frees the technician and bay. |
| `GET` | `/availability?dealershipId=&serviceTypeId=&startTime=` | Probe availability without booking. |
| `GET` | `/dealerships`, `/service-types`, `/customers` | Reference data. |
| `GET` | `/dealerships/:id/service-bays`, `/dealerships/:id/technicians`, `/customers/:id/vehicles` | Reference data. |

## Tests

```bash
# Unit tests (pure availability rules - no DB required)
npm test

# Integration / e2e tests (REQUIRE MySQL running via docker compose)
npm run test:e2e
```

The e2e suite covers: successful booking (`201`), overlapping booking rejected (`409`),
back-to-back booking allowed, cancellation freeing a slot, and a **concurrent
double-booking** test asserting exactly one of two simultaneous requests for the only
free resource succeeds.

## Project layout

```
src/
  entities/                 # TypeORM entities (8)
  appointments/             # core scheduling
    appointments.controller.ts
    appointments.service.ts  # booking transaction + pessimistic locks
    availability.service.ts  # qualification, capability, shift, overlap rules
    dto/
  reference/                # read-only master-data endpoints
  common/                   # global exception filter
  config/                   # shared TypeORM options
  database/                 # standalone DataSource + seed script
test/                       # e2e tests
```
