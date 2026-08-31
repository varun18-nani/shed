import "dotenv/config";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/auth";
import { GET as facultyTimetableGET } from "../app/api/faculty/timetable/route";
import { GET as studentTimetableGET } from "../app/api/student/timetable/route";
import { NextRequest } from "next/server";

// Helper to construct mock NextRequest with a session cookie
function makeAuthenticatedRequest(url: string, token: string | null = null) {
  const req = new NextRequest(new URL(url, "http://localhost:3000"), {
    headers: token ? { Cookie: `session=${token}` } : {},
  });
  return req;
}

async function runPortalTimetableTests() {
  console.log("=== STARTING FACULTY & STUDENT TIMETABLE PORTAL TESTS ===\n");

  const department = await prisma.department.findUnique({ where: { code: "TESTCSD" } });
  if (!department) {
    console.log("TESTCSD department not found. Run seed script first.");
    return;
  }

  // 1. Get or create test faculty with a User account
  let faculty = await prisma.faculty.findFirst({
    where: { departmentId: department.id },
    include: { user: true },
  });

  if (!faculty) {
    console.log("No faculty found in TESTCSD.");
    return;
  }

  // 2. Get or create test section
  const sectionA = await prisma.section.findFirst({
    where: { name: "TESTA", departmentId: department.id },
  });
  if (!sectionA) {
    console.log("Section TESTA not found.");
    return;
  }

  // 3. Get or create test student in sectionA
  let studentUser = await prisma.user.findFirst({
    where: { email: "teststudent1@schedai.edu" },
  });

  if (!studentUser) {
    studentUser = await prisma.user.create({
      data: {
        email: "teststudent1@schedai.edu",
        passwordHash: "$2a$10$dummyHashValueForTestingOnly",
        role: "STUDENT",
        firstName: "Test",
        lastName: "Student",
        student: {
          create: {
            rollNumber: "TSTD001",
            departmentId: department.id,
            sectionId: sectionA.id,
            semester: 5,
          },
        },
      },
    });
  }

  const student = await prisma.student.findUnique({
    where: { userId: studentUser.id },
    include: { user: true, section: true },
  });

  if (!student) {
    console.log("Student record not found.");
    return;
  }

  // Find another section for cross-section test
  let sectionB = await prisma.section.findFirst({
    where: { name: "TESTB", departmentId: department.id },
  });
  if (!sectionB) {
    sectionB = await prisma.section.create({
      data: {
        name: "TESTB",
        semester: 5,
        departmentId: department.id,
      },
    });
  }

  const room = await prisma.room.findFirst({ where: { status: "AVAILABLE" } });
  const subject = await prisma.subject.findFirst({ where: { departmentId: department.id } });
  const timeSlots = await prisma.timeSlot.findMany({ take: 4 });

  if (!room || !subject || timeSlots.length < 3) {
    console.log("Missing prerequisite database records.");
    return;
  }

  const academicYear = "2026-27";

  // Clean up any test timetable entries for these sections
  await prisma.timetableEntry.deleteMany({
    where: {
      sectionId: { in: [sectionA.id, sectionB.id] },
      academicYear,
    },
  });

  // Seed sample entries:
  // Entry 1: sectionA + faculty -> PUBLISHED
  // Entry 2: sectionA + faculty -> DRAFT (should NEVER show up in faculty or student portal)
  // Entry 3: sectionA + faculty -> ARCHIVED (should NEVER show up in faculty or student portal)
  await prisma.timetableEntry.create({
    data: {
      subjectId: subject.id,
      facultyId: faculty.id,
      roomId: room.id,
      timeSlotId: timeSlots[0].id,
      sectionId: sectionA.id,
      academicYear,
      status: "PUBLISHED",
    },
  });

  await prisma.timetableEntry.create({
    data: {
      subjectId: subject.id,
      facultyId: faculty.id,
      roomId: room.id,
      timeSlotId: timeSlots[1].id,
      sectionId: sectionA.id,
      academicYear,
      status: "DRAFT",
    },
  });

  await prisma.timetableEntry.create({
    data: {
      subjectId: subject.id,
      facultyId: faculty.id,
      roomId: room.id,
      timeSlotId: timeSlots[2].id,
      sectionId: sectionA.id,
      academicYear,
      status: "ARCHIVED",
    },
  });

  console.log("Seeded 1 PUBLISHED, 1 DRAFT, 1 ARCHIVED timetable entries for test.\n");

  // Tokens for authentication testing
  const facultyToken = await signToken({ id: faculty.userId, role: "FACULTY" });
  const studentToken = await signToken({ id: student.userId, role: "STUDENT" });

  // ────────────────────────────────────────────────────────────
  // TEST 1: Unauthenticated requests (401)
  // ────────────────────────────────────────────────────────────
  console.log("TEST 1: Unauthenticated requests");
  const unauthFacReq = makeAuthenticatedRequest("http://localhost:3000/api/faculty/timetable", null);
  const unauthFacRes = await facultyTimetableGET(unauthFacReq);
  console.log(`  Faculty timetable without auth: ${unauthFacRes.status} (expected 401)`);

  const unauthStudReq = makeAuthenticatedRequest("http://localhost:3000/api/student/timetable", null);
  const unauthStudRes = await studentTimetableGET(unauthStudReq);
  console.log(`  Student timetable without auth: ${unauthStudRes.status} (expected 401)`);

  // ────────────────────────────────────────────────────────────
  // TEST 2: Role Authorization (403 when wrong role calls portal API)
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 2: Role Authorization Checks");
  const studCallsFacReq = makeAuthenticatedRequest("http://localhost:3000/api/faculty/timetable", studentToken);
  const studCallsFacRes = await facultyTimetableGET(studCallsFacReq);
  console.log(`  Student calling faculty timetable: ${studCallsFacRes.status} (expected 403)`);

  const facCallsStudReq = makeAuthenticatedRequest("http://localhost:3000/api/student/timetable", facultyToken);
  const facCallsStudRes = await studentTimetableGET(facCallsStudReq);
  console.log(`  Faculty calling student timetable: ${facCallsStudRes.status} (expected 403)`);

  // ────────────────────────────────────────────────────────────
  // TEST 3: Faculty Portal returns ONLY PUBLISHED entries
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 3: Faculty Portal Published-Only Filter");
  const facReq = makeAuthenticatedRequest("http://localhost:3000/api/faculty/timetable", facultyToken);
  const facRes = await facultyTimetableGET(facReq);
  const facData: any = await facRes.json();
  console.log(`  Status: ${facRes.status} (expected 200)`);
  console.log(`  Total entries returned: ${facData.entries?.length} (expected 1 PUBLISHED entry)`);
  console.log(
    `  All entries are PUBLISHED: ${facData.entries?.every((e: any) => e.status === "PUBLISHED")}`
  );
  console.log(
    `  No DRAFT entries present: ${facData.entries?.every((e: any) => e.status !== "DRAFT")}`
  );
  console.log(
    `  No ARCHIVED entries present: ${facData.entries?.every((e: any) => e.status !== "ARCHIVED")}`
  );

  // ────────────────────────────────────────────────────────────
  // TEST 4: Student Portal returns ONLY PUBLISHED entries for their section
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 4: Student Portal Published-Only Filter");
  const studReq = makeAuthenticatedRequest("http://localhost:3000/api/student/timetable", studentToken);
  const studRes = await studentTimetableGET(studReq);
  const studData: any = await studRes.json();
  console.log(`  Status: ${studRes.status} (expected 200)`);
  console.log(`  Total entries returned: ${studData.entries?.length} (expected 1 PUBLISHED entry)`);
  console.log(
    `  All entries are PUBLISHED: ${studData.entries?.every((e: any) => e.status === "PUBLISHED")}`
  );
  console.log(
    `  Section matches student's section (TESTA): ${studData.entries?.every(
      (e: any) => e.section?.name === "TESTA"
    )}`
  );
  console.log(
    `  No DRAFT entries present: ${studData.entries?.every((e: any) => e.status !== "DRAFT")}`
  );
  console.log(
    `  No ARCHIVED entries present: ${studData.entries?.every((e: any) => e.status !== "ARCHIVED")}`
  );

  // ────────────────────────────────────────────────────────────
  // TEST 5: Query filters (Academic Year)
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 5: Academic Year Query Filter");
  const filterMatchReq = makeAuthenticatedRequest(
    "http://localhost:3000/api/faculty/timetable?academicYear=2026-27",
    facultyToken
  );
  const filterMatchRes = await facultyTimetableGET(filterMatchReq);
  const filterMatchData: any = await filterMatchRes.json();
  console.log(`  Matching academic year query returned entries: ${filterMatchData.entries?.length} (expected 1)`);

  const filterMismatchReq = makeAuthenticatedRequest(
    "http://localhost:3000/api/faculty/timetable?academicYear=1999-00",
    facultyToken
  );
  const filterMismatchRes = await facultyTimetableGET(filterMismatchReq);
  const filterMismatchData: any = await filterMismatchRes.json();
  console.log(`  Non-matching academic year query returned entries: ${filterMismatchData.entries?.length} (expected 0)`);

  // Cleanup test entries
  await prisma.timetableEntry.deleteMany({
    where: {
      sectionId: { in: [sectionA.id, sectionB.id] },
      academicYear,
    },
  });

  console.log("\nCleaned up test timetable entries.");
  console.log("\n=== ALL FACULTY & STUDENT PORTAL TIMETABLE TESTS PASSED ===");
}

runPortalTimetableTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
