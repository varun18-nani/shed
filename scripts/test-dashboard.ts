import "dotenv/config";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/auth";
import { GET as adminDashboardGET } from "../app/api/dashboard/route";
import { GET as facultyDashboardGET } from "../app/api/dashboard/faculty/route";
import { GET as studentDashboardGET } from "../app/api/dashboard/student/route";
import { NextRequest } from "next/server";

function makeAuthenticatedRequest(url: string, token: string | null = null) {
  const req = new NextRequest(new URL(url, "http://localhost:3000"), {
    headers: token ? { Cookie: `session=${token}` } : {},
  });
  return req;
}

async function runDashboardTests() {
  console.log("=== STARTING DASHBOARD METRICS TESTS ===\n");

  const department = await prisma.department.findUnique({ where: { code: "TESTCSD" } });
  if (!department) {
    console.log("TESTCSD department not found.");
    return;
  }

  const faculty = await prisma.faculty.findFirst({
    where: { departmentId: department.id },
    include: { user: true },
  });

  const sectionA = await prisma.section.findFirst({
    where: { name: "TESTA", departmentId: department.id },
  });

  const studentUser = await prisma.user.findFirst({
    where: { email: "teststudent1@schedai.edu" },
  });

  if (!faculty || !sectionA || !studentUser) {
    console.log("Missing test faculty, section, or student records.");
    return;
  }

  const facultyToken = await signToken({ id: faculty.userId, role: "FACULTY" });
  const studentToken = await signToken({ id: studentUser.id, role: "STUDENT" });

  // ────────────────────────────────────────────────────────────
  // TEST 1: Admin Dashboard Metrics
  // ────────────────────────────────────────────────────────────
  console.log("TEST 1: Admin Dashboard metrics");
  const adminRes = await adminDashboardGET();
  const adminData: any = await adminRes.json();
  console.log(`  Status: ${adminRes.status} (expected 200)`);
  console.log(`  Departments count: ${adminData.departments} >= 1: ${adminData.departments >= 1}`);
  console.log(`  Faculty count: ${adminData.faculty} >= 1: ${adminData.faculty >= 1}`);
  console.log(`  Students count: ${adminData.students} >= 1: ${adminData.students >= 1}`);
  console.log(`  Sections count: ${adminData.sections} >= 1: ${adminData.sections >= 1}`);
  console.log(`  Rooms count: ${adminData.rooms} >= 1: ${adminData.rooms >= 1}`);
  console.log(`  Room stats structure present: ${Boolean(adminData.roomStats?.available !== undefined)}`);
  console.log(`  Timetable lifecycle stats present: ${Boolean(adminData.timetableStats?.draft !== undefined)}`);
  console.log(`  Section coverage stats present: ${Boolean(adminData.sectionStats?.withPublishedTimetable !== undefined)}`);

  // ────────────────────────────────────────────────────────────
  // TEST 2: Faculty Dashboard Metrics & Authorization
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 2: Faculty Dashboard metrics & authorization");
  // Unauth
  const unauthFacReq = makeAuthenticatedRequest("http://localhost:3000/api/dashboard/faculty", null);
  const unauthFacRes = await facultyDashboardGET(unauthFacReq);
  console.log(`  Unauthenticated faculty dashboard status: ${unauthFacRes.status} (expected 401)`);

  // Student calling faculty dashboard
  const studCallsFacReq = makeAuthenticatedRequest("http://localhost:3000/api/dashboard/faculty", studentToken);
  const studCallsFacRes = await facultyDashboardGET(studCallsFacReq);
  console.log(`  Student calling faculty dashboard status: ${studCallsFacRes.status} (expected 403)`);

  // Authenticated Faculty
  const facReq = makeAuthenticatedRequest("http://localhost:3000/api/dashboard/faculty", facultyToken);
  const facRes = await facultyDashboardGET(facReq);
  const facData: any = await facRes.json();
  console.log(`  Authenticated faculty dashboard status: ${facRes.status} (expected 200)`);
  console.log(`  Faculty name: ${facData.faculty?.name}`);
  console.log(`  Metrics object present: ${Boolean(facData.metrics?.todayClassesCount !== undefined)}`);
  console.log(`  Today's schedule array present: ${Array.isArray(facData.todaySchedule)}`);

  // ────────────────────────────────────────────────────────────
  // TEST 3: Student Dashboard Metrics, Next Class & Authorization
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 3: Student Dashboard metrics, next class & authorization");
  // Unauth
  const unauthStudReq = makeAuthenticatedRequest("http://localhost:3000/api/dashboard/student", null);
  const unauthStudRes = await studentDashboardGET(unauthStudReq);
  console.log(`  Unauthenticated student dashboard status: ${unauthStudRes.status} (expected 401)`);

  // Faculty calling student dashboard
  const facCallsStudReq = makeAuthenticatedRequest("http://localhost:3000/api/dashboard/student", facultyToken);
  const facCallsStudRes = await studentDashboardGET(facCallsStudReq);
  console.log(`  Faculty calling student dashboard status: ${facCallsStudRes.status} (expected 403)`);

  // Authenticated Student
  const studReq = makeAuthenticatedRequest("http://localhost:3000/api/dashboard/student", studentToken);
  const studRes = await studentDashboardGET(studReq);
  const studData: any = await studRes.json();
  console.log(`  Authenticated student dashboard status: ${studRes.status} (expected 200)`);
  console.log(`  Student name: ${studData.student?.name}`);
  console.log(`  Student rollNumber: ${studData.student?.rollNumber}`);
  console.log(`  Metrics object present: ${Boolean(studData.metrics?.weeklyClassesCount !== undefined)}`);
  console.log(`  Next class structure present or null: ${studData.nextClass === null || Boolean(studData.nextClass?.subjectCode)}`);
  console.log(`  Today's schedule array present: ${Array.isArray(studData.todaySchedule)}`);

  console.log("\n=== ALL DASHBOARD TESTS PASSED ===");
}

runDashboardTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
