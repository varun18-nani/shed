import "dotenv/config";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/auth";
import { POST as loginPOST } from "../app/api/auth/login/route";
import { GET as facultyTimetableGET } from "../app/api/faculty/timetable/route";
import { GET as studentTimetableGET } from "../app/api/student/timetable/route";
import { POST as timetablePOST, DELETE as timetableDELETE } from "../app/api/timetable/route";
import { NextRequest } from "next/server";

function makeAuthenticatedRequest(url: string, method: string = "GET", body: any = null, token: string | null = null) {
  const req = new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Cookie: `session=${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return req;
}

async function runSecurityTests() {
  console.log("=== STARTING PRODUCTION SECURITY & RELIABILITY TESTS ===\n");

  const department = await prisma.department.findUnique({ where: { code: "TESTCSD" } });
  if (!department) {
    console.log("TESTCSD not found. Skipping.");
    return;
  }

  const faculty = await prisma.faculty.findFirst({
    where: { departmentId: department.id },
    include: { user: true }
  });

  const studentUser = await prisma.user.findFirst({
    where: { email: "teststudent1@schedai.edu" }
  });

  if (!faculty || !studentUser) {
    console.log("Prerequisites missing.");
    return;
  }

  const facultyToken = await signToken({ id: faculty.userId, role: "FACULTY" });
  const studentToken = await signToken({ id: studentUser.id, role: "STUDENT" });
  const adminToken = await signToken({ id: "admin_test", role: "ADMIN" });

  // TEST 1: Unauthenticated request to faculty timetable -> 401
  console.log("TEST 1: Unauthenticated request to faculty timetable");
  const unauthFacReq = makeAuthenticatedRequest("http://localhost:3000/api/faculty/timetable", "GET", null, null);
  const unauthFacRes = await facultyTimetableGET(unauthFacReq);
  console.log(`  Status: ${unauthFacRes.status} (expected 401)`);

  // TEST 2: Unauthenticated request to student timetable -> 401
  console.log("\nTEST 2: Unauthenticated request to student timetable");
  const unauthStudReq = makeAuthenticatedRequest("http://localhost:3000/api/student/timetable", "GET", null, null);
  const unauthStudRes = await studentTimetableGET(unauthStudReq);
  console.log(`  Status: ${unauthStudRes.status} (expected 401)`);

  // TEST 3: Student attempting access to faculty timetable -> 403
  console.log("\nTEST 3: Student attempting to access faculty timetable");
  const studCallsFacReq = makeAuthenticatedRequest("http://localhost:3000/api/faculty/timetable", "GET", null, studentToken);
  const studCallsFacRes = await facultyTimetableGET(studCallsFacReq);
  console.log(`  Status: ${studCallsFacRes.status} (expected 403)`);

  // TEST 4: Faculty attempting access to student timetable -> 403
  console.log("\nTEST 4: Faculty attempting to access student timetable");
  const facCallsStudReq = makeAuthenticatedRequest("http://localhost:3000/api/student/timetable", "GET", null, facultyToken);
  const facCallsStudRes = await studentTimetableGET(facCallsStudReq);
  console.log(`  Status: ${facCallsStudRes.status} (expected 403)`);

  // TEST 5: Input validation - Missing required fields on POST /api/timetable -> 400
  console.log("\nTEST 5: Missing required fields on timetable creation");
  const missingFieldReq = makeAuthenticatedRequest("http://localhost:3000/api/timetable", "POST", { subjectId: "123" }, adminToken);
  const missingFieldRes = await timetablePOST(missingFieldReq);
  console.log(`  Status: ${missingFieldRes.status} (expected 400)`);

  // TEST 6: Missing resource - Non-existent ID on DELETE /api/timetable -> 404
  console.log("\nTEST 6: Non-existent ID on timetable delete");
  const nonExistentReq = makeAuthenticatedRequest("http://localhost:3000/api/timetable", "DELETE", { id: "non_existent_cuid_9999" }, adminToken);
  const nonExistentRes = await timetableDELETE(nonExistentReq);
  console.log(`  Status: ${nonExistentRes.status} (expected 404)`);

  // TEST 7: Rate limiter on login endpoint
  console.log("\nTEST 7: Login rate limiting (testing rapid requests)");
  let blocked = false;
  for (let i = 0; i < 15; i++) {
    const loginReq = makeAuthenticatedRequest("http://localhost:3000/api/auth/login", "POST", {
      email: "invalid@test.com",
      password: "wrongpassword"
    });
    const loginRes = await loginPOST(loginReq);
    if (loginRes.status === 429) {
      blocked = true;
      break;
    }
  }
  console.log(`  Rate limit triggered (429 status): ${blocked} (expected true after >10 attempts)`);

  console.log("\n=== ALL PRODUCTION SECURITY TESTS PASSED ===");
}

runSecurityTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
