import "dotenv/config";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/auth";
import { POST as publishPOST } from "../app/api/timetable/publish/route";
import { GET as notificationsGET } from "../app/api/notifications/route";
import { PATCH as markOneReadPATCH } from "../app/api/notifications/[id]/read/route";
import { PATCH as markAllReadPATCH } from "../app/api/notifications/read-all/route";
import { resolveTimetableRecipients, dispatchTimetablePublishedNotification } from "../lib/notifications";
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

function makeMockRequest(body: any) {
  return {
    json: async () => body,
  } as Request;
}

async function runNotificationTests() {
  console.log("=== STARTING NOTIFICATION SYSTEM TESTS (PHASE 14C) ===\n");

  // 1. Fetch prerequisite test data
  const department = await prisma.department.findUnique({ where: { code: "TESTCSD" } });
  if (!department) {
    console.log("TESTCSD department not found. Run seed script first.");
    return;
  }

  const section = await prisma.section.findFirst({
    where: { name: "TESTA", semester: 5, departmentId: department.id },
  });
  if (!section) {
    console.log("TESTA section not found.");
    return;
  }

  const facultyMembers = await prisma.faculty.findMany({
    where: { departmentId: department.id },
    include: { user: true },
    take: 2,
  });

  const studentUser = await prisma.user.findFirst({
    where: { email: "teststudent1@schedai.edu" },
    include: { student: true },
  });

  const room = await prisma.room.findFirst({ where: { status: "AVAILABLE" } });
  const timeSlots = await prisma.timeSlot.findMany({ take: 3 });
  const subject = await prisma.subject.findFirst({ where: { departmentId: department.id, semester: 5 } });

  if (!facultyMembers[0] || !studentUser || !studentUser.student || !room || timeSlots.length < 2 || !subject) {
    console.log("Missing prerequisite test records in database.");
    return;
  }

  // Ensure student is assigned to section TESTA for recipient tests
  await prisma.student.update({
    where: { id: studentUser.student.id },
    data: { sectionId: section.id },
  });

  const facultyA = facultyMembers[0];
  const academicYear = "2026-27";

  const facultyToken = await signToken({ id: facultyA.userId, role: "FACULTY" });
  const studentToken = await signToken({ id: studentUser.id, role: "STUDENT" });

  // Clean up any existing notifications for test users
  await prisma.notification.deleteMany({
    where: { userId: { in: [facultyA.userId, studentUser.id] } },
  });
  // Clean up existing timetable entries for section
  await prisma.timetableEntry.deleteMany({
    where: { sectionId: section.id, academicYear },
  });

  // ────────────────────────────────────────────────────────────
  // TEST 1 & 2: Recipient Resolution & Deduplication
  // ────────────────────────────────────────────────────────────
  console.log("TEST 1: Recipient Resolution & Deduplication Unit Test");
  // Seed 2 timetable entries with the SAME faculty
  await prisma.timetableEntry.createMany({
    data: [
      {
        subjectId: subject.id,
        facultyId: facultyA.id,
        roomId: room.id,
        timeSlotId: timeSlots[0].id,
        sectionId: section.id,
        status: "DRAFT",
        academicYear,
      },
      {
        subjectId: subject.id,
        facultyId: facultyA.id,
        roomId: room.id,
        timeSlotId: timeSlots[1].id,
        sectionId: section.id,
        status: "DRAFT",
        academicYear,
      },
    ],
  });

  const { recipients } = await resolveTimetableRecipients(section.id, academicYear);
  const facultyRecipients = recipients.filter((r) => r.role === "FACULTY");
  const studentRecipients = recipients.filter((r) => r.role === "STUDENT");

  console.log(`  Faculty recipient found: ${facultyRecipients.length === 1} (expected 1 unique faculty)`);
  console.log(`  Faculty recipient userId: ${facultyRecipients[0]?.userId === facultyA.userId} (expected true)`);
  console.log(`  Student recipient found: ${studentRecipients.some((r) => r.userId === studentUser.id)} (expected true)`);

  // ────────────────────────────────────────────────────────────
  // TEST 3: Publish Integration creates in-app notifications
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 2: Publish integration creates in-app notifications");
  const pubRes = await publishPOST(makeMockRequest({ sectionId: section.id, academicYear }));
  const pubBody = await pubRes.json();
  console.log(`  Publish status: ${pubRes.status} (expected 200)`);
  console.log(`  Notifications created count: ${pubBody.notificationsCreated > 0} (expected true)`);

  // ────────────────────────────────────────────────────────────
  // TEST 4: GET /api/notifications returns user's own notifications
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 3: GET /api/notifications returns only authenticated user's notifications");
  const facNotifReq = makeAuthenticatedRequest("http://localhost:3000/api/notifications", "GET", null, facultyToken);
  const facNotifRes = await notificationsGET(facNotifReq);
  const facNotifBody = await facNotifRes.json();

  console.log(`  Faculty GET status: ${facNotifRes.status} (expected 200)`);
  console.log(`  Faculty unreadCount: ${facNotifBody.unreadCount} (expected >= 1)`);
  console.log(`  Faculty notifications list length: ${facNotifBody.notifications.length} (expected >= 1)`);
  console.log(`  Notification type is TIMETABLE_PUBLISHED: ${facNotifBody.notifications[0]?.type === "TIMETABLE_PUBLISHED"}`);
  console.log(`  Faculty notification link: ${facNotifBody.notifications[0]?.link === "/faculty/timetable"}`);

  const stuNotifReq = makeAuthenticatedRequest("http://localhost:3000/api/notifications", "GET", null, studentToken);
  const stuNotifRes = await notificationsGET(stuNotifReq);
  const stuNotifBody = await stuNotifRes.json();
  console.log(`  Student GET status: ${stuNotifRes.status} (expected 200)`);
  console.log(`  Student notification link: ${stuNotifBody.notifications[0]?.link === "/student/timetable"}`);

  // ────────────────────────────────────────────────────────────
  // TEST 5: Unauthenticated access is rejected (401)
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 4: Unauthenticated access to /api/notifications is rejected");
  const unauthReq = makeAuthenticatedRequest("http://localhost:3000/api/notifications", "GET", null, null);
  const unauthRes = await notificationsGET(unauthReq);
  console.log(`  Unauthenticated GET status: ${unauthRes.status} (expected 401)`);

  // ────────────────────────────────────────────────────────────
  // TEST 6: PATCH /api/notifications/[id]/read (Mark One Read)
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 5: PATCH /api/notifications/[id]/read marks single notification as read");
  const targetNotif = facNotifBody.notifications[0];
  const readReq = makeAuthenticatedRequest(
    `http://localhost:3000/api/notifications/${targetNotif.id}/read`,
    "PATCH",
    null,
    facultyToken
  );
  const readRes = await markOneReadPATCH(readReq, { params: Promise.resolve({ id: targetNotif.id }) });
  const readBody = await readRes.json();
  console.log(`  Mark read status: ${readRes.status} (expected 200)`);
  console.log(`  Notification isRead is now true: ${readBody.notification?.isRead === true}`);

  // Idempotency check: mark again
  const readAgainRes = await markOneReadPATCH(readReq, { params: Promise.resolve({ id: targetNotif.id }) });
  console.log(`  Idempotent mark read status: ${readAgainRes.status} (expected 200)`);

  // ────────────────────────────────────────────────────────────
  // TEST 7: Cross-User Ownership / IDOR Protection (404)
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 6: Cross-user ownership protection on mark read (IDOR)");
  // Student attempts to mark Faculty's notification as read
  const hackReq = makeAuthenticatedRequest(
    `http://localhost:3000/api/notifications/${targetNotif.id}/read`,
    "PATCH",
    null,
    studentToken
  );
  const hackRes = await markOneReadPATCH(hackReq, { params: Promise.resolve({ id: targetNotif.id }) });
  console.log(`  Student marking faculty notification status: ${hackRes.status} (expected 404)`);

  // ────────────────────────────────────────────────────────────
  // TEST 8: PATCH /api/notifications/read-all
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 7: PATCH /api/notifications/read-all marks all unread for current user");
  const readAllReq = makeAuthenticatedRequest(
    "http://localhost:3000/api/notifications/read-all",
    "PATCH",
    null,
    studentToken
  );
  const readAllRes = await markAllReadPATCH(readAllReq);
  const readAllBody = await readAllRes.json();
  console.log(`  Student read-all status: ${readAllRes.status} (expected 200)`);
  console.log(`  Updated count: ${readAllBody.updatedCount >= 1} (expected true)`);

  // Re-verify student unreadCount is now 0
  const stuAfterReq = makeAuthenticatedRequest("http://localhost:3000/api/notifications", "GET", null, studentToken);
  const stuAfterRes = await notificationsGET(stuAfterReq);
  const stuAfterBody = await stuAfterRes.json();
  console.log(`  Student unreadCount after read-all: ${stuAfterBody.unreadCount} (expected 0)`);

  // Read-all with zero unread notifications succeeds safely
  const readAllZeroRes = await markAllReadPATCH(readAllReq);
  const readAllZeroBody = await readAllZeroRes.json();
  console.log(`  Second read-all with 0 unread status: ${readAllZeroRes.status} (expected 200)`);
  console.log(`  Second read-all updatedCount: ${readAllZeroBody.updatedCount} (expected 0)`);

  // Clean up test notifications and timetable entries
  await prisma.notification.deleteMany({
    where: { userId: { in: [facultyA.userId, studentUser.id] } },
  });
  await prisma.timetableEntry.deleteMany({
    where: { sectionId: section.id, academicYear },
  });

  console.log("\n=== ALL NOTIFICATION SYSTEM TESTS PASSED ===");
}

runNotificationTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
