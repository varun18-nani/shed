# SchedAI — Academic Timetable Management System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=nextdotjs)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma%20Postgres-336791?logo=postgresql)](https://www.prisma.io/postgres)

SchedAI is a full-stack, multi-role Academic Timetable Management System built with **Next.js App Router**, **Prisma ORM**, and **PostgreSQL**. It supports automated constraint-based timetable generation, lifecycle management (DRAFT → PUBLISHED → ARCHIVED), dedicated Faculty and Student portals, and live dashboard metrics.

---

## Features

### Admin Portal
- **Department**, **Faculty**, **Student**, **Section**, **Subject**, **Room**, and **TimeSlot** CRUD management.
- **Constraint-based Timetable Generator** — automatically schedules subjects without faculty, room, or section conflicts.
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

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
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
│   │   ├── students/    # CRUD + timetable portal
│   │   ├── subjects/
│   │   ├── rooms/
│   │   ├── sections/
│   │   ├── timeslots/
│   │   └── timetable/   # CRUD + generate + publish + archive
├── components/
│   ├── dashboard/       # QuickActions
│   └── layout/          # Sidebar, FacultySidebar, StudentSidebar
├── lib/
│   ├── auth.ts          # JWT token sign/verify
│   ├── prisma.ts        # Prisma Client singleton
│   └── timetable/
│       └── generator.ts # Constraint-based scheduling algorithm
├── prisma/
│   └── schema.prisma    # Database schema
├── scripts/
│   ├── seed-admin.ts    # Initial admin user seeder
│   ├── test-generator.ts
│   ├── test-publishing.ts
│   ├── test-portal-timetable.ts
│   └── test-dashboard.ts
└── middleware.ts        # Route protection & role-based access
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
| `npm run test:generator` | Run generator constraint tests (11 tests) |
| `npm run test:publishing` | Run lifecycle tests (9 tests) |
| `npm run test:portals` | Run portal authorization tests (5 tests) |
| `npm run test:dashboard` | Run dashboard metrics tests |
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

---

## Roles & Authorization

| Role | Access |
|---|---|
| `ADMIN` | Full access to all management, CRUD, generator, publishing, and metrics APIs. |
| `FACULTY` | Read-only access to their own assigned published timetable and dashboard. |
| `STUDENT` | Read-only access to their section's published timetable and dashboard. |

Identity is always resolved server-side from the JWT session cookie. Client-provided `facultyId` or `studentId` are never trusted for authorization.

---

## Timetable Lifecycle

```
DRAFT  →  [Publish]  →  PUBLISHED  →  [Archive]  →  ARCHIVED
                ↑
        Conflict re-validation
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
| TypeScript (`tsc --noEmit`) | 0 errors | ✅ PASS |
| Production Build (`next build`) | 38 pages | ✅ PASS |

---

## License

MIT — see [LICENSE](LICENSE) for details.
