# Future Implementations (Phase 2)

**International scale, multi-instance deployment**

Phase 2 extends the **Phase 1** scheduler for a company operating globally with high traffic,
multiple load-balanced API instances, payment-gated bookings, and abuse controls.

Nothing in this document is implemented yet. It builds on the current Phase 1 model:

- **Customer** — single entity for credentials, profile, vehicles, appointments, and order history (no separate `User` table).
- **Admin** — separate credentials; each admin **belongs to one AdminGroup**.
- **AdminGroup** — holds **Privileges** that gate admin actions.

See [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) for the implemented Phase 1 architecture and ERD.

---

## 1. Goals

When Phase 1 limits are reached (single instance, immediate confirmation, no payments):

- **Horizontal scaling** — multiple API instances behind a load balancer.
- **Distributed concurrency** — Redis locks layered over DB pessimistic locks.
- **Payment holds** — deposit required before confirming; 10-minute slot hold.
- **Observability** — structured logging, OpenTelemetry tracing, correlation IDs.
- **Read scaling** — MySQL master/replica routing.
- **Abuse prevention** — banned/blacklisted customers, IP tracking and blocklists.
- **Admin audit trail** — comments on every order through the payment lifecycle.

---

## 2. Domain Model (Phase 2 ERD)

Phase 2 **extends** the Phase 1 model. Entities marked **(new)** or **(changed)** below.

```mermaid
erDiagram
  ADMIN }o--|| ADMIN_GROUP : "belongs to"
  ADMIN_GROUP }o--o{ PRIVILEGE : "grants"
  ADMIN ||--o{ ADMIN_COMMENT : "writes"

  CUSTOMER ||--o{ VEHICLE : owns
  CUSTOMER ||--o{ APPOINTMENT : books
  CUSTOMER ||--o{ AVAILABILITY_WATCH : creates
  CUSTOMER ||--o{ CUSTOMER_IP_LOG : "actions from"
  VEHICLE ||--o{ APPOINTMENT : "serviced in"
  DEALERSHIP ||--o{ SERVICE_BAY : has
  DEALERSHIP ||--o{ TECHNICIAN : employs
  DEALERSHIP ||--o{ APPOINTMENT : hosts
  SERVICE_TYPE ||--o{ APPOINTMENT : "is of"
  SERVICE_TYPE }o--o{ SKILL : requires
  SERVICE_TYPE }o--o{ CAPABILITY : "requires bay"
  TECHNICIAN }o--o{ SKILL : holds
  SERVICE_BAY }o--o{ CAPABILITY : provides
  TECHNICIAN ||--o{ APPOINTMENT : performs
  SERVICE_BAY ||--o{ APPOINTMENT : "is used by"
  APPOINTMENT ||--o{ ADMIN_COMMENT : "has audit trail"

  CUSTOMER {
    int id PK
    string name
    string email UK
    string passwordHash
    string phone
    enum status "ACTIVE|FLAGGED|BANNED|BLACKLISTED"
    string statusReason
    datetime createdAt
    datetime updatedAt
  }

  ADMIN {
    int id PK
    int adminGroupId FK
    string email UK
    string passwordHash
    string displayName
  }

  ADMIN_GROUP {
    int id PK
    string name UK
  }

  PRIVILEGE {
    int id PK
    string code UK
    string description
  }

  APPOINTMENT {
    int id PK
    int customerId FK
    int vehicleId FK
    int dealershipId FK
    int serviceTypeId FK
    int technicianId FK
    int serviceBayId FK
    datetime startTime
    datetime endTime
    enum status "LEAD|PENDING|FAILED|CONFIRMED|CANCELLED"
    datetime holdExpiresAt
    string paymentRef
    string idempotencyKey UK
    datetime createdAt
  }

  ADMIN_COMMENT {
    int id PK
    int appointmentId FK
    int adminId FK
    enum type "SYSTEM|PAYMENT_SUCCESS|PAYMENT_FAILURE|MANUAL_REVIEW|MODERATION|GENERAL"
    string reason
    text body
    datetime createdAt
  }

  CUSTOMER_IP_LOG {
    int id PK
    int customerId FK
    string ipAddress
    string action
    string userAgent
    datetime createdAt
  }

  IP_BLOCKLIST {
    int id PK
    string ipAddress UK
    string reason
    int linkedCustomerId FK
    datetime createdAt
  }

  AVAILABILITY_WATCH {
    int id PK
    int customerId FK
    int dealershipId FK
    int serviceTypeId FK
    datetime windowStart
    datetime windowEnd
    enum status "ACTIVE|NOTIFIED|CANCELLED"
    datetime notifiedAt
    datetime notifiedSlot
    datetime createdAt
  }

  DEALERSHIP {
    int id PK
    string name
    string address
  }

  CAPABILITY {
    int id PK
    string code UK
    string name
    string description
    boolean active
  }

  SKILL {
    int id PK
    string name UK
  }

  SERVICE_TYPE {
    int id PK
    string name UK
    int durationMinutes
  }

  SERVICE_BAY {
    int id PK
    int dealershipId FK
    string name
  }

  TECHNICIAN {
    int id PK
    int dealershipId FK
    string name
    int shiftStartMinutes
    int shiftEndMinutes
  }

  VEHICLE {
    int id PK
    int customerId FK
    string vin
    string make
    string model
    int year
  }
```

### Join tables (unchanged from Phase 1)

| Table | Links |
|-------|-------|
| `service_bay_capabilities` | ServiceBay ↔ Capability |
| `service_type_required_capabilities` | ServiceType ↔ Capability |
| `service_type_required_skills` | ServiceType ↔ Skill |
| `technician_skills` | Technician ↔ Skill |
| `admin_group_privileges` | AdminGroup ↔ Privilege |

### Key schema changes from Phase 1

| Area | Phase 1 | Phase 2 |
|------|---------|---------|
| `Appointment.status` | `CONFIRMED`, `CANCELLED` | `LEAD`, `PENDING`, `FAILED`, `CONFIRMED`, `CANCELLED` |
| Busy-resource filter | `CONFIRMED` only | `LEAD`, `PENDING`, `CONFIRMED` |
| Payment fields on `Appointment` | — | `holdExpiresAt`, `paymentRef`, `idempotencyKey` |
| `Customer.status` | implicit `ACTIVE` only | `ACTIVE`, `FLAGGED`, `BANNED`, `BLACKLISTED` + `statusReason` |
| **New tables** | — | `admin_comments`, `customer_ip_logs`, `ip_blocklist` |
| **New privileges** | — | `MODERATE_CUSTOMERS`, `COMMENT_ORDERS` |
| Auth model | Customer + Admin (separate) | unchanged — still no `User` table |

---

## 3. Payment-Hold Booking Flow

```mermaid
sequenceDiagram
  participant Cust as Customer
  participant API as API_instance
  participant Lock as Redis_lock
  participant BI as bookingIntentProcessor
  participant DB as MySQL_master
  participant Hold as Redis_hold
  participant Pay as paymentProvider
  participant WM as paymentWebhookManager
  participant PS as paymentSuccessProcessor
  participant PF as paymentFailureProcessor
  participant AC as AdminComment

  Cust->>API: POST /booking-intents
  API->>Lock: acquire booking lock
  API->>BI: enqueue intent
  BI->>DB: create Appointment LEAD + FOR UPDATE
  BI->>Hold: SET hold TTL 10min
  BI->>AC: SYSTEM comment
  API-->>Cust: LEAD + holdExpiresAt

  Cust->>Pay: pay via external provider
  Pay->>WM: POST /webhooks/payment (signed)
  WM->>WM: verify HMAC signature

  alt payment.success and clean
    WM->>PS: enqueue success
    PS->>DB: status CONFIRMED
    PS->>Hold: release
    PS->>AC: PAYMENT_SUCCESS comment
    PS->>Cust: confirmation email
  else payment.success but suspicious
    WM->>PS: enqueue success (suspicious flag)
    PS->>DB: status PENDING
    PS->>AC: MANUAL_REVIEW comment
  else payment.failure
    WM->>PF: enqueue failure
    PF->>DB: status FAILED
    PF->>Hold: release
    PF->>AC: PAYMENT_FAILURE comment
  end

  Note over API,Hold: Cron sweeps expired LEAD holds → FAILED
```

### Appointment status lifecycle

```
LEAD ──(payment success, clean)──► CONFIRMED
LEAD ──(payment success, suspicious)──► PENDING ──(admin review)──► CONFIRMED | FAILED
LEAD ──(payment failure)──► FAILED
LEAD ──(hold expired, 10 min)──► FAILED
CONFIRMED ──(cancel)──► CANCELLED
```

---

## 4. Distributed Concurrency

**Problem:** pessimistic DB locks work within one connection pool but multiple API instances
can still contend heavily and increase deadlock risk.

**Planned approach — layered locking:**

1. **Redis distributed lock** (Redlock-style) keyed by `dealership:serviceType:startTime` to
   serialize booking intents across instances.
2. **DB `FOR UPDATE`** remains the final correctness guard — never remove it.
3. **Idempotency keys** on booking intents and webhook processing to dedupe retries.

Redis hold keys (`hold:{technicianId}:{bayId}:{startIso}`) complement LEAD rows for fast
cross-instance visibility before DB commit propagates.

---

## 5. Caching (SWR)

Phase 1 uses simple read-through TTL caching. Phase 2 adds **stale-while-revalidate**:

- Serve fresh data within `freshTtl`.
- Serve stale data within `freshTtl + staleTtl` while a single background refresh runs.
- Per-key Redis refresh lock (`SET NX`) prevents cache stampede on hot keys (availability
  probes, reference lists).

---

## 6. Observability

| Component | Planned tool |
|-----------|--------------|
| Structured logs | nestjs-pino (JSON per line) |
| Correlation ID | `x-correlation-id` middleware on every request |
| Tracing | OpenTelemetry → OTLP (Jaeger/Tempo in compose) |
| Metrics | Optional Prometheus `/metrics` endpoint |

Env vars: `LOG_LEVEL`, `OTEL_ENABLED`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`.

---

## 7. Database Read Replicas

TypeORM replication config in `data-source-options.ts`:

- **Master:** all writes, transactions, `FOR UPDATE` locks.
- **Replicas:** availability probes, reference reads, list queries (eventually consistent).

Env: `DB_REPLICA_HOSTS=host1,host2` (comma-separated).

---

## 8. Abuse Controls

Abuse tracking applies to **customers** (the booking actors), not a separate user table.

| Feature | Description |
|---------|-------------|
| `Customer.status` | `FLAGGED` (watch), `BANNED` (blocked, reversible), `BLACKLISTED` (permanent + IP block) |
| IP logging | `CustomerIpLog` records IP per customer/action |
| IP blocklist | Auto-populated when a customer is blacklisted; manual admin entries |
| Guards | `AbuseGuard` + `IpTrackingMiddleware` reject banned/blacklisted customers and blocked IPs |
| Admin API | Ban, blacklist, flag, reinstate customers; view IP logs and blocklist |

New privilege: `MODERATE_CUSTOMERS`.

Customer JWT validation (`JwtStrategy`) re-checks `Customer.status` on every request so a
banned customer cannot keep using an old token.

---

## 9. Admin Comments

Every payment lifecycle branch writes an `AdminComment`:

| Type | When |
|------|------|
| `SYSTEM` | LEAD created, hold expiry |
| `PAYMENT_SUCCESS` | Clean payment confirmation |
| `PAYMENT_FAILURE` | Payment failed or hold expired |
| `MANUAL_REVIEW` | Suspicious payment → PENDING |
| `MODERATION` | Admin ban/blacklist actions on a customer |
| `GENERAL` | Manual admin notes |

Surfaced on admin appointment detail endpoints. New privilege: `COMMENT_ORDERS`.

---

## 10. New API Endpoints (planned)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/booking-intents` | Enqueue LEAD creation with payment hold (customer JWT) |
| `GET` | `/booking-intents/:jobId` | Poll intent result (customer JWT) |
| `POST` | `/webhooks/payment` | Signed payment provider webhook |
| `GET` | `/admin/appointments/:id/comments` | Order audit trail |
| `POST` | `/admin/appointments/:id/comments` | Add manual comment |
| `POST` | `/admin/customers/:id/ban` | Ban customer |
| `POST` | `/admin/customers/:id/blacklist` | Blacklist customer + block known IPs |
| `POST` | `/admin/customers/:id/flag` | Flag for review |
| `POST` | `/admin/customers/:id/reinstate` | Restore ACTIVE |
| `GET` | `/admin/customers/:id/ip-logs` | IP history for customer |
| `GET` | `/admin/blocklist/ips` | IP blocklist |

---

## 11. Infrastructure Additions

| Service | Purpose |
|---------|---------|
| Jaeger / Tempo | Trace collection (OTLP) |
| MySQL replica(s) | Read scaling |
| Multiple API pods | Load-balanced behind ingress |

Docker Compose would gain a tracing backend; production would use managed MySQL replicas.

---

## 12. Migration Path from Phase 1

1. Add migration expanding `appointments.status` enum and payment columns (`holdExpiresAt`, `paymentRef`, `idempotencyKey`).
2. Add `admin_comments`, `customer_ip_logs`, `ip_blocklist` tables.
3. Add `customers.status` + `customers.statusReason` columns (default existing rows to `ACTIVE`).
4. Deploy Redis lock + hold services alongside existing booking path.
5. Feature-flag `/booking-intents` vs direct `/appointments` booking.
6. Enable read replicas for reference/availability reads only.
7. Roll out observability stack before multi-instance cutover.

**Risk:** changing busy-status filter from `CONFIRMED`-only to include `LEAD`/`PENDING` must
ship atomically with the payment-hold flow to avoid double-booking during holds.

**No User table migration:** Phase 1 never had a `users` table; customer and admin credentials
already live on `customers` and `admins` respectively.

---

## 13. Out of Scope (even in Phase 2)

- Payment provider integration (FE handles checkout; we only receive webhooks).
- Multi-dealership timezone localization.
- Customer-facing UI.
- Multi-resource jobs (multiple technicians per appointment).
- Re-introducing a shared `User` auth table (customer and admin remain separate principals).
