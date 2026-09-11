import "dotenv/config"
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  const email = 'admin@schedai.com'
  const password = 'adminpassword123'
  
  const passwordHash = await bcrypt.hash(password, 10)
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      firstName: 'System',
      lastName: 'Admin',
      isActive: true,
    }
  })
  
  console.log(`Admin account ready: ${user.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
PHASE 15A — SERVER-SIDE PDF EXPORT ONLY

SchedAI current verified state:

- Timetable generation works
- Multi-candidate optimization works
- Publishing lifecycle works
- Faculty portal works
- Student portal works
- Notifications are complete through Phase 14D
- Notification APIs work
- NotificationBell is integrated
- TypeScript passes
- Production build passes
- Current build has 43 routes

DO NOT modify the existing timetable generator, optimizer, scoring engine, publishing lifecycle, notification system, portals, dashboards, authentication, middleware, health checks, or logger.

We are implementing ONLY the SERVER-SIDE PDF EXPORT endpoint.

==================================================
GOAL
==================================================

Create:

app/api/timetable/export/pdf/route.ts

The endpoint must generate a professional printable PDF for a published timetable.

==================================================
STEP 1 — INSPECT EXISTING TIMETABLE DATA
==================================================

Before implementing anything, inspect:

- prisma/schema.prisma
- TimetableEntry model
- Subject model
- Faculty model
- Section model
- Department model
- Room model
- existing timetable API routes
- existing CSV export implementation
- existing print/export functionality

Reuse existing database relationships and formatting conventions.

Do NOT invent a second timetable data structure.

==================================================
STEP 2 — ENDPOINT
==================================================

Implement:

GET /api/timetable/export/pdf

Accept the same identifying parameters used by the existing timetable export/view APIs where practical.

For example, use:

sectionId
academicYear

Do NOT assume parameter names without inspecting the existing APIs.

==================================================
STEP 3 — AUTHENTICATION
==================================================

Reuse the existing authentication/session mechanism.

Do not create new authentication logic.

Respect existing RBAC rules.

The endpoint must not expose timetable information to unauthenticated users.

Do not bypass authorization.

==================================================
STEP 4 — PUBLISHED ONLY
==================================================

The PDF must ONLY contain timetable entries with:

status = PUBLISHED

Never export:

DRAFT
ARCHIVED

If the requested published timetable does not exist, return an appropriate HTTP error using the project's existing API conventions.

==================================================
STEP 5 — PDF CONTENT
==================================================

Generate a clean institutional timetable PDF containing:

Header:

- SchedAI / institution title if available
- Department
- Section
- Semester
- Academic Year

Timetable:

- Days as rows or columns
- Time slots
- Subject code
- Subject name
- Faculty name
- Room name/number

Use the actual structure and available fields from the Prisma schema.

Do not invent data that does not exist.

If some timetable fields are null, display a sensible fallback such as "—".

==================================================
STEP 6 — LAYOUT
==================================================

The PDF should be suitable for:

- printing
- sharing
- notice boards
- institutional records

Use landscape orientation if necessary.

Ensure:

- readable fonts
- table borders
- consistent spacing
- page margins
- header/footer
- no text clipping
- no overlapping cells

If the timetable spans multiple pages, repeat the table header where supported.

==================================================
STEP 7 — DEPENDENCIES
==================================================

Inspect package.json before selecting a PDF library.

Prefer an already installed dependency if suitable.

If a new dependency is absolutely necessary:

- choose a lightweight, mature server-compatible library
- do not introduce paid services
- do not introduce an external PDF API
- do not require an external SaaS provider

Do not install unnecessary packages.

==================================================
STEP 8 — SECURITY
==================================================

Do not expose:

- database credentials
- AUTH_SECRET
- internal errors
- stack traces

Follow existing error handling conventions.

==================================================
STEP 9 — RESPONSE
==================================================

Return the generated PDF with the correct headers.

Use an appropriate:

Content-Type: application/pdf

Also provide a sensible filename, for example:

schedai-timetable-{section}-{academicYear}.pdf

Sanitize dynamic filename components.

==================================================
STEP 10 — TESTING
==================================================

Create focused tests for the PDF export if the project's testing architecture supports API route tests.

At minimum verify:

1. Unauthenticated request is rejected.
2. Non-published timetable cannot be exported.
3. Published timetable can be exported.
4. Correct section is exported.
5. Correct academic year is respected.
6. PDF response has application/pdf content type.
7. PDF generation does not crash with optional/null faculty or room values.

Do NOT modify existing tests just to make them pass.

==================================================
STEP 11 — VERIFICATION
==================================================

Run:

npx tsc --noEmit

npm run test:all

npm run build

All existing tests must continue passing.

==================================================
FILE SCOPE
==================================================

Expected:

NEW:
app/api/timetable/export/pdf/route.ts

Possibly:
package.json
package-lock.json
one focused PDF test file if appropriate

Do not modify unrelated files.

==================================================
STOP CONDITION
==================================================

STOP after Phase 15A.

Do NOT implement:

- PDF download button
- admin UI changes
- print UI changes
- email attachments
- deployment
- Docker
- CI/CD
- Phase 16

Return a report containing:

A. Files created/modified
B. PDF library used
C. Endpoint and parameters
D. Authentication/RBAC behavior
E. Published-only behavior
F. PDF contents
G. Test results
H. TypeScript result
I. Build result
J. Any remaining concerns

Do not continue beyond Phase 15A.