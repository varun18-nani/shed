# SchedAI — Academic Timetable Management System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=nextdotjs)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma%20Postgres-336791?logo=postgresql)](https://www.prisma.io/postgres)

SchedAI is a full-stack, multi-role Academic Timetable Management System built with **Next.js App Router**, **Prisma ORM**, and **PostgreSQL**. It supports automated constraint-based timetable generation, multi-candidate optimization, lifecycle management (DRAFT → PUBLISHED → ARCHIVED), dedicated Faculty and Student portals, live dashboard metrics, and production observability.

---

## Features

### Admin Portal
- **Department**, **Faculty**, **Student**, **Section**, **Subject**, **Room**, and **TimeSlot** CRUD management.
- **Constraint-based Timetable Generator** — automatically schedules subjects without faculty, room, or section conflicts.
- **Multi-Candidate Optimization** — generates 1–5 distinct candidate schedules using different strategies, scores each with a quality engine (0–100), and lets the admin compare and select the best one.
- **Regenerate Workflow** — safely replaces an existing DRAFT timetable via an atomic Prisma transaction. Published/Archived timetables are never overwritten.
- **Publishing Lifecycle** — Atomic transitions: `DRAFT → PUBLISHED → ARCHIVED` with collision re-validation.
- **CSV Export** and **Print View** for timetable schedules.
- **Dashboard** — Real-time institution-wide metrics (entities, room status, timetable lifecycle, section coverage, recent activity).

### Faculty Portal
- Read-only view of **personally assigned** published timetable periods.
- **Dashboard** — Today's teaching schedule, weekly class count, assigned subjects/sections.
- Only `PUBLISHED` entries are ever visible — zero exposure of drafts.

### Student Portal
- Read-only view of their **section's** published timetable periods.
- **Dashboard** — Prominent **Next Class** card (live time-aware), today's schedule, weekly class summary.
- Only `PUBLISHED` entries are ever visible — zero exposure of drafts.

### Production Observability (Phase 13)
- **Health Check API** — `GET /api/health` returns DB connectivity, latency, and server uptime with `X-Request-ID` header.
- **Structured Logging** — `lib/logger.ts` redacts sensitive keys (passwords, tokens, secrets) in all log output.
- **Request ID Propagation** — `X-Request-ID` header injected on every API response for tracing.
- **Production Config Check** — `npm run check:production` validates all required env vars without printing secret values.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Webpack) |
| Language | TypeScript 5 |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Database | Prisma Postgres (PostgreSQL) |
| Auth | JWT (`jose`) + Secure `HttpOnly` session cookies |
| Styling | Tailwind CSS 4 |
| UI Components | Lucide React, Framer Motion |
| Testing | `tsx` + Direct API handler invocation |

---

## Getting Started

### 1. Prerequisites
- Node.js ≥ 20
- Access to a PostgreSQL database (or [Prisma Postgres](https://prisma.io/postgres))

### 2. Clone & Install
```bash
git clone https://github.com/varun18-nani/shed.git
cd shed
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` and fill in your database URL and auth secret:
```env
DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
AUTH_SECRET="your-very-long-random-secret-here"
NODE_ENV="development"
```

Generate your `AUTH_SECRET` with:
```bash
openssl rand -base64 64
```

### 4. Set Up the Database
```bash
# Apply Prisma schema to your database
npm run db:push

# Generate Prisma Client
npm run db:generate

# Seed the initial Admin user
npm run db:seed
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### 6. Login
Use the credentials created by `npm run db:seed` (default admin email and password from `scripts/seed-admin.ts`).

---

## Project Structure

```
/
├── app/
│   ├── admin/           # Admin portal pages (departments, faculty, rooms, timetable, etc.)
│   ├── faculty/         # Faculty portal (dashboard, timetable)
│   ├── student/         # Student portal (dashboard, timetable)
│   ├── api/
│   │   ├── auth/        # login, logout
│   │   ├── dashboard/   # admin, faculty, student dashboard metrics APIs
│   │   ├── departments/ # CRUD
│   │   ├── faculty/     # CRUD + timetable portal
│   │   ├── health/      # GET /api/health — DB connectivity + latency check
│   │   ├── students/    # CRUD + timetable portal
│   │   ├── subjects/
│   │   ├── rooms/
│   │   ├── sections/
│   │   ├── timeslots/
│   │   └── timetable/   # CRUD + generate + optimize + publish + archive
│   │       ├── optimize/        # POST — generate multiple scored candidates
│   │       └── optimize/select/ # POST — atomically save selected candidate as DRAFT
├── components/
│   ├── dashboard/       # QuickActions
│   └── layout/          # Sidebar, FacultySidebar, StudentSidebar
├── lib/
│   ├── auth.ts          # JWT token sign/verify
│   ├── logger.ts        # Structured logging with sensitive-key redaction
│   ├── rate-limit.ts    # IP-based brute-force rate limiter
│   ├── prisma.ts        # Prisma Client singleton
│   └── timetable/
│       ├── generator.ts # Constraint-based scheduling algorithm
│       ├── scoring.ts   # Quality scoring engine (0–100)
│       └── optimizer.ts # Multi-candidate generation with deterministic variation
├── prisma/
│   └── schema.prisma    # Database schema
├── scripts/
│   ├── seed-admin.ts          # Initial admin user seeder
│   ├── check-production.ts    # Validate production env vars
│   ├── test-generator.ts      # Generator constraint tests
│   ├── test-publishing.ts     # Lifecycle tests
│   ├── test-portal-timetable.ts
│   ├── test-dashboard.ts
│   ├── test-security.ts       # Rate limiting & security header tests
│   ├── test-timetable-intelligence.ts # Scoring engine tests
│   ├── test-optimization.ts   # Multi-candidate optimization tests
│   └── test-health.ts         # Health endpoint tests
└── middleware.ts        # Route protection, role-based access, X-Request-ID injection
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run type-check` | Run TypeScript type validation |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:push` | Push schema changes to database |
| `npm run db:migrate` | Apply pending migrations (production) |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:seed` | Seed initial admin user |
| `npm run check:production` | Validate all production environment variables |
| `npm run test:generator` | Run generator constraint tests (11 tests) |
| `npm run test:publishing` | Run lifecycle tests (9 tests) |
| `npm run test:security` | Run security & rate-limit tests |
| `npm run test:intelligence` | Run timetable quality scoring tests |
| `npm run test:optimization` | Run multi-candidate optimization tests |
| `npm run test:health` | Run health endpoint tests (requires running server) |
| `npm run test:all` | Run all test suites sequentially |

---

## API Overview

### Authentication
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login with email + password, sets `session` cookie |
| `POST` | `/api/auth/logout` | Clear session cookie |

### Admin APIs (ADMIN role required for mutations)
| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/api/departments` | Department CRUD |
| `GET/POST` | `/api/faculty` | Faculty CRUD |
| `GET/POST` | `/api/students` | Student CRUD |
| `GET/POST` | `/api/sections` | Section CRUD |
| `GET/POST` | `/api/subjects` | Subject CRUD |
| `GET/POST` | `/api/rooms` | Room CRUD |
| `GET/POST` | `/api/timeslots` | TimeSlot CRUD |
| `GET/POST/PATCH/DELETE` | `/api/timetable` | Timetable entry CRUD |
| `POST` | `/api/timetable/generate` | Auto-generate timetable (constraint-based) |
| `POST` | `/api/timetable/generate` (preview=true) | Preview schedule + quality score without saving |
| `POST` | `/api/timetable/optimize` | Generate 1–5 scored candidate timetables |
| `POST` | `/api/timetable/optimize/select` | Atomically save a selected candidate as DRAFT |
| `POST` | `/api/timetable/publish` | Publish a section's timetable |
| `POST` | `/api/timetable/archive` | Archive a section's timetable |

### Dashboard APIs (role-gated)
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/dashboard` | ADMIN | Institution-wide metrics |
| `GET` | `/api/dashboard/faculty` | FACULTY | Faculty teaching metrics & today's schedule |
| `GET` | `/api/dashboard/student` | STUDENT | Student schedule metrics & next class |

### Portal APIs (read-only, role-gated)
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/faculty/timetable` | FACULTY | Own published timetable entries |
| `GET` | `/api/student/timetable` | STUDENT | Section's published timetable entries |

### Observability APIs (public)
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | DB connectivity check, latency, server status, `X-Request-ID` |

---

## Timetable Optimization Workflow

The **Optimize & Compare** feature (Phase 12) enhances the basic generator:

1. **Admin selects** Department → Semester → Section → Academic Year in the Generator panel.
2. Admin clicks **"Optimize & Compare"** — the system generates 3–4 candidate timetables using different strategies (Balanced Distribution, Compact Morning Focus, Resource Optimized, Alternative Faculty Spacing, Even Workload Spread).
3. **Each candidate is scored** by the Quality Scoring Engine (0–100) across 5 dimensions: Day Spread, Subject Balance, Gap Efficiency, Room Utilization, and Consecutive Load.
4. **Candidate cards** appear in a comparison grid. Admin can preview each candidate's schedule on the timetable grid before committing.
5. Admin clicks **"Apply"** on their preferred candidate — it is atomically saved to the database as the official DRAFT timetable.

### Regeneration
For sections that already have a DRAFT timetable, the **"Regenerate Draft"** button in the lifecycle bar:
1. Shows a confirmation dialog explaining that the current DRAFT will be replaced.
2. On confirmation, runs the full optimization flow with `allowExistingDraft: true`.
3. The `/api/timetable/optimize/select` endpoint transactionally deletes the old DRAFT entries and inserts the new selected candidate — guaranteed atomic via `prisma.$transaction`.

> **Safety Guarantee:** Published and Archived timetables are **never** overwritten. Any attempt returns HTTP 409.

---

## Health Check Endpoint

```bash
GET /api/health
```

**Response (200 OK)**:
```json
{
  "status": "ok",
  "timestamp": "2026-08-31T15:00:00.000Z",
  "environment": "production",
  "database": {
    "status": "connected",
    "latencyMs": 12
  }
}
```

The endpoint:
- Performs a lightweight `SELECT 1` ping to verify database connectivity.
- Returns HTTP **503** if the database is unreachable (for load balancer health checks).
- Always includes an `X-Request-ID` response header for distributed tracing.
- Requires **no authentication** — safe to probe from monitoring systems (e.g. Uptime Robot, AWS ELB).

---

## Production Deployment

### 1. Validate Environment
```bash
npm run check:production
```
This validates `DATABASE_URL`, `AUTH_SECRET`, and `NODE_ENV` without printing secret values.

### 2. Apply Database Migrations
```bash
npm run db:migrate    # production-safe: applies pending migration files
npm run db:generate   # re-generate Prisma Client for the new schema
```

### 3. Build
```bash
npm run build
```

### 4. Start
```bash
npm run start
# OR with custom port:
PORT=8080 npm run start
```

### 5. Health Check
Point your load balancer or uptime monitor to:
```
GET https://your-domain.com/api/health
```
Expect HTTP 200. A 503 means the database connection is down.

### 6. Security Checklist
- `AUTH_SECRET` must be **at least 32 characters** (prefer 48+ via `openssl rand -base64 64`).
- `NODE_ENV=production` must be set — the app will refuse to start if `AUTH_SECRET` is missing in production.
- Brute-force rate limiting is active on `/api/auth/login` (5 attempts / 15 min per IP).
- Security headers (X-Frame-Options, X-Content-Type-Options, CSP, etc.) are set by `middleware.ts`.

---

## Roles & Authorization

| Role | Access |
|---|---|
| `ADMIN` | Full access to all management, CRUD, generator, optimization, publishing, and metrics APIs. |
| `FACULTY` | Read-only access to their own assigned published timetable and dashboard. |
| `STUDENT` | Read-only access to their section's published timetable and dashboard. |

Identity is always resolved server-side from the JWT session cookie. Client-provided `facultyId` or `studentId` are never trusted for authorization.

---

## Timetable Lifecycle

```
DRAFT  →  [Publish]  →  PUBLISHED  →  [Archive]  →  ARCHIVED
  ↑
[Regenerate] (replaces DRAFT atomically)
        ↑
Conflict re-validation at publish time
(room availability, faculty clash)
```

- FACULTY and STUDENT portals see **only `PUBLISHED` entries**.
- `DRAFT` and `ARCHIVED` entries are never returned to Faculty or Student endpoints.

---

## Test Status

All test suites pass against a live Prisma Postgres database:

| Suite | Tests | Status |
|---|---|---|
| Generator Constraint Tests | 11/11 | ✅ PASS |
| Publishing Lifecycle Tests | 9/9 | ✅ PASS |
| Portal Authorization Tests | 5/5 | ✅ PASS |
| Dashboard Metrics Tests | 9/9 | ✅ PASS |
| Security & Rate-Limit Tests | 8/8 | ✅ PASS |
| Timetable Intelligence Tests | 8/8 | ✅ PASS |
| Optimization Tests | 7+ | ✅ PASS |
| Health Endpoint Tests | 7/7 | ✅ PASS |
| TypeScript (`tsc --noEmit`) | 0 errors | ✅ PASS |
| Production Build (`next build`) | all pages | ✅ PASS |

---

## License

MIT — see [LICENSE](LICENSE) for details.
