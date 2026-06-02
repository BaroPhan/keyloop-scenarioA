# Unified Service Scheduler — Brief System Design

**Keyloop · Scenario A (Ownership) · Phase 1** — Full detail: [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)

**One-page PDF:** open [docs/BRIEF_SYSTEM_DESIGN.html](docs/BRIEF_SYSTEM_DESIGN.html) → Print → Save as PDF, or run `npm run export:brief-pdf` (requires `npx playwright install chromium`).

## Overview

NestJS REST API that confirms bookings only when a **capable service bay** and **qualified technician** are both free for the **entire** service duration. Stack: MySQL, Redis, BullMQ, JWT (customers + admins), RBAC, availability watches, email.

## Goals

| Requirement | Solution |
|-------------|----------|
| Resource-constrained booking | Atomic assign bay + technician for `[start, end)` |
| Real-time availability | `GET /availability`, `GET /availability/slots` (cached) |
| Confirmed record | `CONFIRMED` / `CANCELLED`; only confirmed blocks resources |

**Rules:** fixed duration per service type; tech has all required skills; bay has all capabilities; half-open overlap `[start,end)`; UTC; future `startTime` only.

## Architecture

```
Client → NestJS (modules/application/presentation)
       → MySQL (appointments, resources)
       → Redis (ref ~300s, availability ~15s)
       → BullMQ (mail, availability-watch) → Mailpit
```

**Layers:** `domain/` entities · `modules/*/application` use cases · `infrastructure/` cache, queue, mail · `shared/presentation/` guards, DTOs.

## Domain (core entities)

Customer → Vehicles, Appointments, Watches · Dealership → Bays, Technicians · ServiceType ↔ Skills & Capabilities · Appointment links all resources · Admin → Group → Privileges.

## Booking flow

1. Discover slots → 2. `POST /appointments` → 3. Transaction (READ COMMITTED): lock bays & technicians (`FOR UPDATE`), exclude overlapping CONFIRMED → 4. **201** or **409** → invalidate cache → enqueue email.

**Concurrency:** pessimistic row locks; fixed lock order (bays then techs). E2e proves one winner under parallel book. Multi-instance locking → Phase 2.

## Auth & API (summary)

| Audience | Auth | Key routes |
|----------|------|------------|
| Public | — | Book, availability, reference GET (paginated) |
| Customer | JWT | `/me/appointments`, `GET /appointments` (own), watches, cancel, reschedule |
| Admin | JWT + privilege | CRUD resources, `GET /appointments` (all with `VIEW_APPOINTMENTS`) |

**Privileges (8):** `VIEW_APPOINTMENTS`, `MANAGE_*` (capabilities, bays, technicians, dealerships, service-types, skills), `MANAGE_ADMINS`. No `/admin` URL prefix.

## Tech & test

NestJS 10 · TypeORM · MySQL 8 · Redis · BullMQ · argon2/JWT · Jest unit + e2e · Docker Compose.

**Demo:** `jane@example.com` / `password123` · `admin@example.com` / `admin12345` · Swagger `/api/docs`

**Phase 2:** distributed locking, payments, scale — [FUTURE_IMPLEMENTATIONS.md](FUTURE_IMPLEMENTATIONS.md)
