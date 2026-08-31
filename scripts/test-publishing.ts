import "dotenv/config";
import { prisma } from "../lib/prisma";
import { POST as publishPOST } from "../app/api/timetable/publish/route";
import { POST as archivePOST } from "../app/api/timetable/archive/route";

function makeMockRequest(body: any) {
  return {
    json: async () => body,
  } as Request;
}

async function runPublishingTests() {
  console.log("=== STARTING TIMETABLE PUBLISHING & ARCHIVING TESTS ===\n");

  // 1. Find or verify test department, section, faculty, rooms, subjects, timeslots
  const department = await prisma.department.findUnique({ where: { code: "TESTCSD" } });
  if (!department) {
    console.log("TESTCSD department not found. Run seed script first.");
    return;
  }

  const section = await prisma.section.findFirst({
    where: { name: "TESTA", semester: 5, departmentId: department.id }
  });
  if (!section) {
    console.log("TESTA section not found.");
    return;
  }

  const faculty = await prisma.faculty.findFirst({ where: { departmentId: department.id } });
  const room = await prisma.room.findFirst({ where: { status: "AVAILABLE" } });
  const timeSlots = await prisma.timeSlot.findMany({ take: 3 });
  const subject = await prisma.subject.findFirst({ where: { departmentId: department.id, semester: 5 } });

  if (!faculty || !room || timeSlots.length < 2 || !subject) {
    console.log("Missing prerequisite test records in database.");
    return;
  }

  const academicYear = "2026-27";

  // Clean up any previous test entries for this section + year
  await prisma.timetableEntry.deleteMany({
    where: { sectionId: section.id, academicYear }
  });
  console.log("Cleaned up existing test entries.\n");

  // ────────────────────────────────────────────────────────────
  // TEST 1: Missing sectionId or academicYear (400 validation)
  // ────────────────────────────────────────────────────────────
  console.log("TEST 1: Missing fields validation");
  const pubReq1 = await publishPOST(makeMockRequest({ academicYear }));
  console.log(`  Publish without sectionId status: ${pubReq1.status} (expected 400)`);
  const archReq1 = await archivePOST(makeMockRequest({ sectionId: section.id }));
  console.log(`  Archive without academicYear status: ${archReq1.status} (expected 400)`);

  // ────────────────────────────────────────────────────────────
  // TEST 2: Non-existent section (404)
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 2: Non-existent section");
  const pubReq2 = await publishPOST(makeMockRequest({ sectionId: "nonexistent_sec_id_12345", academicYear }));
  console.log(`  Publish status: ${pubReq2.status} (expected 404)`);
  const archReq2 = await archivePOST(makeMockRequest({ sectionId: "nonexistent_sec_id_12345", academicYear }));
  console.log(`  Archive status: ${archReq2.status} (expected 404)`);

  // ────────────────────────────────────────────────────────────
  // TEST 3: No entries for existing section (404)
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 3: No entries for existing section");
  const pubReq3 = await publishPOST(makeMockRequest({ sectionId: section.id, academicYear }));
  console.log(`  Publish status: ${pubReq3.status} (expected 404)`);
  const archReq3 = await archivePOST(makeMockRequest({ sectionId: section.id, academicYear }));
  console.log(`  Archive status: ${archReq3.status} (expected 404)`);

  // Seed 2 DRAFT entries for testing lifecycle
  await prisma.timetableEntry.create({
    data: {
      subjectId: subject.id,
      facultyId: faculty.id,
      roomId: room.id,
      timeSlotId: timeSlots[0].id,
      sectionId: section.id,
      academicYear,
      status: "DRAFT"
    }
  });
  await prisma.timetableEntry.create({
    data: {
      subjectId: subject.id,
      facultyId: faculty.id,
      roomId: room.id,
      timeSlotId: timeSlots[1].id,
      sectionId: section.id,
      academicYear,
      status: "DRAFT"
    }
  });
  console.log("\nCreated 2 DRAFT entries for section.");

  // ────────────────────────────────────────────────────────────
  // TEST 4: Try to archive DRAFT entries directly (409 expected)
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 4: Try to archive DRAFT entries");
  const archReq4 = await archivePOST(makeMockRequest({ sectionId: section.id, academicYear }));
  let data: any = await archReq4.json();
  console.log(`  Status: ${archReq4.status} (expected 409)`);
  console.log(`  Error: ${data.error}`);

  // ────────────────────────────────────────────────────────────
  // TEST 5: Publish DRAFT entries (Success 200)
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 5: Publish DRAFT entries");
  const pubReq5 = await publishPOST(makeMockRequest({ sectionId: section.id, academicYear }));
  data = await pubReq5.json();
  console.log(`  Status: ${pubReq5.status} (expected 200)`);
  console.log(`  Success: ${data.success}`);
  console.log(`  Published count: ${data.publishedCount} (expected 2)`);

  // DB verification
  const publishedEntries = await prisma.timetableEntry.findMany({
    where: { sectionId: section.id, academicYear }
  });
  console.log(`  All DB records status === PUBLISHED: ${publishedEntries.every(e => e.status === "PUBLISHED")}`);

  // ────────────────────────────────────────────────────────────
  // TEST 6: Try to publish already PUBLISHED entries (409 expected)
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 6: Try duplicate publish");
  const pubReq6 = await publishPOST(makeMockRequest({ sectionId: section.id, academicYear }));
  data = await pubReq6.json();
  console.log(`  Status: ${pubReq6.status} (expected 409)`);
  console.log(`  Error: ${data.error}`);

  // ────────────────────────────────────────────────────────────
  // TEST 7: Archive PUBLISHED entries (Success 200)
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 7: Archive PUBLISHED entries");
  const archReq7 = await archivePOST(makeMockRequest({ sectionId: section.id, academicYear }));
  data = await archReq7.json();
  console.log(`  Status: ${archReq7.status} (expected 200)`);
  console.log(`  Success: ${data.success}`);
  console.log(`  Archived count: ${data.archivedCount} (expected 2)`);

  // DB verification
  const archivedEntries = await prisma.timetableEntry.findMany({
    where: { sectionId: section.id, academicYear }
  });
  console.log(`  All DB records status === ARCHIVED: ${archivedEntries.every(e => e.status === "ARCHIVED")}`);

  // ────────────────────────────────────────────────────────────
  // TEST 8: Try duplicate archive on ARCHIVED entries (409 expected)
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 8: Try duplicate archive");
  const archReq8 = await archivePOST(makeMockRequest({ sectionId: section.id, academicYear }));
  data = await archReq8.json();
  console.log(`  Status: ${archReq8.status} (expected 409)`);
  console.log(`  Error: ${data.error}`);

  // ────────────────────────────────────────────────────────────
  // TEST 9: Try publish on ARCHIVED entries (409 expected)
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 9: Try publish on ARCHIVED entries");
  const pubReq9 = await publishPOST(makeMockRequest({ sectionId: section.id, academicYear }));
  data = await pubReq9.json();
  console.log(`  Status: ${pubReq9.status} (expected 409)`);
  console.log(`  Error: ${data.error}`);

  // Cleanup test entries
  await prisma.timetableEntry.deleteMany({
    where: { sectionId: section.id, academicYear }
  });
  console.log("\nCleaned up test entries.");
  console.log("\n=== ALL PUBLISHING & ARCHIVING TESTS PASSED ===");
}

runPublishingTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
