import "dotenv/config";
import { prisma } from "../lib/prisma";
import { POST } from "../app/api/timetable/generate/route";

function makeMockRequest(body: any) {
  return {
    json: async () => body,
  } as Request;
}

async function runTests() {
  console.log("=== STARTING GENERATOR API TESTS ===\n");

  // Use the TESTCSD department seeded by seed-test-data.ts
  const department = await prisma.department.findUnique({ where: { code: "TESTCSD" } });
  if (!department) {
    console.log("TESTCSD department not found. Run: npx tsx scripts/seed-test-data.ts first.");
    return;
  }

  const section = await prisma.section.findFirst({
    where: { name: "TESTA", semester: 5, departmentId: department.id }
  });
  if (!section) {
    console.log("TESTA section not found. Run: npx tsx scripts/seed-test-data.ts first.");
    return;
  }

  const academicYear = "2026-27";

  console.log(`Using Department: ${department.code} (${department.id})`);
  console.log(`Using Section: ${section.name} (${section.id}), Semester: ${section.semester}`);
  console.log(`Academic Year: ${academicYear}\n`);

  // Clean up any previous test entries
  const deleted = await prisma.timetableEntry.deleteMany({
    where: { sectionId: section.id, academicYear }
  });
  console.log(`Cleaned up ${deleted.count} existing test entries.\n`);

  // ────────────────────────────────────────────────
  // TEST 1 — Valid generation
  // ────────────────────────────────────────────────
  console.log("TEST 1: Valid generation");
  let req = makeMockRequest({
    departmentId: department.id,
    semester: 5,
    sectionId: section.id,
    academicYear
  });
  let res = await POST(req);
  let data = await res.json();
  console.log(`  Status: ${res.status}`);
  console.log(`  Success: ${data.success}`);
  console.log(`  Entries Created: ${data.entriesCreated || 0}`);
  if (data.diagnostics) console.log(`  Diagnostics:`, JSON.stringify(data.diagnostics));

  if (data.success && data.entriesCreated > 0) {
    // DATABASE VERIFICATION
    console.log("\n  --- DATABASE VERIFICATION ---");
    const dbEntries = await prisma.timetableEntry.findMany({
      where: { sectionId: section.id, academicYear },
      include: {
        subject: true,
        faculty: true,
        room: true,
        timeSlot: true,
      }
    });

    console.log(`  DB entry count: ${dbEntries.length}`);
    console.log(`  All DRAFT: ${dbEntries.every(e => e.status === "DRAFT")}`);
    console.log(`  All correct academicYear: ${dbEntries.every(e => e.academicYear === academicYear)}`);
    console.log(`  All correct sectionId: ${dbEntries.every(e => e.sectionId === section.id)}`);
    console.log(`  All rooms AVAILABLE: ${dbEntries.every(e => e.room.status === "AVAILABLE")}`);

    // Check room capacity
    const sectionCap = section.capacity || 0;
    if (sectionCap > 0) {
      const capOk = dbEntries.every(e => e.room.capacity >= sectionCap);
      console.log(`  Room capacity >= section capacity (${sectionCap}): ${capOk}`);
    }

    // Check no duplicate section+timeSlot
    const sectionSlotKeys = dbEntries.map(e => `${e.sectionId}_${e.timeSlotId}`);
    const uniqueSectionSlots = new Set(sectionSlotKeys);
    console.log(`  No duplicate section+timeSlot: ${uniqueSectionSlots.size === sectionSlotKeys.length}`);

    // Check no duplicate faculty+timeSlot
    const facultySlotKeys = dbEntries.map(e => `${e.facultyId}_${e.timeSlotId}`);
    const uniqueFacultySlots = new Set(facultySlotKeys);
    console.log(`  No duplicate faculty+timeSlot: ${uniqueFacultySlots.size === facultySlotKeys.length}`);

    // Check no duplicate room+timeSlot
    const roomSlotKeys = dbEntries.map(e => `${e.roomId}_${e.timeSlotId}`);
    const uniqueRoomSlots = new Set(roomSlotKeys);
    console.log(`  No duplicate room+timeSlot: ${uniqueRoomSlots.size === roomSlotKeys.length}`);

    // Check subject credits match
    const subjects = await prisma.subject.findMany({
      where: { departmentId: department.id, semester: 5 }
    });
    const subjectCreditsMap = new Map(subjects.map(s => [s.id, s.credits]));
    const subjectCounts: Record<string, number> = {};
    for (const e of dbEntries) {
      subjectCounts[e.subjectId] = (subjectCounts[e.subjectId] || 0) + 1;
    }
    let creditsMatch = true;
    for (const [subId, count] of Object.entries(subjectCounts)) {
      const expected = subjectCreditsMap.get(subId);
      if (count !== expected) {
        console.log(`  Subject ${subId}: expected ${expected} periods, got ${count}`);
        creditsMatch = false;
      }
    }
    console.log(`  Subject periods match credits: ${creditsMatch}`);
    console.log("  --- END VERIFICATION ---");
  }

  // ────────────────────────────────────────────────
  // TEST 2 — Duplicate generation
  // ────────────────────────────────────────────────
  console.log("\nTEST 2: Duplicate generation (same section+year)");
  req = makeMockRequest({
    departmentId: department.id,
    semester: 5,
    sectionId: section.id,
    academicYear
  });
  res = await POST(req);
  data = await res.json();
  console.log(`  Status: ${res.status} (expected 409)`);
  console.log(`  Error: ${data.error}`);
  console.log(`  Existing entries: ${data.existingEntries}`);

  // ────────────────────────────────────────────────
  // TEST 3 — Invalid department
  // ────────────────────────────────────────────────
  console.log("\nTEST 3: Invalid department");
  req = makeMockRequest({
    departmentId: "nonexistent_dept_id",
    semester: 5,
    sectionId: section.id,
    academicYear
  });
  res = await POST(req);
  data = await res.json();
  console.log(`  Status: ${res.status} (expected 404)`);
  console.log(`  Error: ${data.error}`);

  // ────────────────────────────────────────────────
  // TEST 4 — Invalid section
  // ────────────────────────────────────────────────
  console.log("\nTEST 4: Invalid section");
  req = makeMockRequest({
    departmentId: department.id,
    semester: 5,
    sectionId: "nonexistent_section_id",
    academicYear
  });
  res = await POST(req);
  data = await res.json();
  console.log(`  Status: ${res.status} (expected 404)`);
  console.log(`  Error: ${data.error}`);

  // ────────────────────────────────────────────────
  // TEST 5 — Section/department mismatch
  // ────────────────────────────────────────────────
  console.log("\nTEST 5: Section/department mismatch");
  const otherDept = await prisma.department.findFirst({
    where: { id: { not: department.id } }
  });
  if (otherDept) {
    req = makeMockRequest({
      departmentId: otherDept.id,
      semester: 5,
      sectionId: section.id,
      academicYear
    });
    res = await POST(req);
    data = await res.json();
    console.log(`  Status: ${res.status} (expected 409)`);
    console.log(`  Error: ${data.error}`);
  } else {
    console.log("  Skipped: No other department available for mismatch test.");
  }

  // ────────────────────────────────────────────────
  // TEST 6 — Section/semester mismatch
  // ────────────────────────────────────────────────
  console.log("\nTEST 6: Section/semester mismatch");
  req = makeMockRequest({
    departmentId: department.id,
    semester: 3, // Section is semester 5
    sectionId: section.id,
    academicYear
  });
  res = await POST(req);
  data = await res.json();
  console.log(`  Status: ${res.status} (expected 409)`);
  console.log(`  Error: ${data.error}`);

  // ────────────────────────────────────────────────
  // TEST 7 — Missing faculty
  // ────────────────────────────────────────────────
  console.log("\nTEST 7: Missing faculty on a subject");
  // Clean up test entries first
  await prisma.timetableEntry.deleteMany({ where: { sectionId: section.id, academicYear } });

  const subjects = await prisma.subject.findMany({
    where: { departmentId: department.id, semester: 5 }
  });
  if (subjects.length > 0) {
    const target = subjects[0];
    const originalFacultyId = target.facultyId;
    await prisma.subject.update({ where: { id: target.id }, data: { facultyId: null } });

    req = makeMockRequest({
      departmentId: department.id,
      semester: 5,
      sectionId: section.id,
      academicYear
    });
    res = await POST(req);
    data = await res.json();
    console.log(`  Status: ${res.status} (expected 409)`);
    console.log(`  Error: ${data.error || data.diagnostics?.error}`);
    if (data.diagnostics?.unschedulableSubjects) {
      console.log(`  Unschedulable subjects:`, JSON.stringify(data.diagnostics.unschedulableSubjects));
    }

    // Restore
    await prisma.subject.update({ where: { id: target.id }, data: { facultyId: originalFacultyId } });
  } else {
    console.log("  Skipped: No subjects available.");
  }

  // ────────────────────────────────────────────────
  // TEST 8 — Insufficient rooms (all UNAVAILABLE)
  // ────────────────────────────────────────────────
  console.log("\nTEST 8: Insufficient rooms (all UNAVAILABLE)");
  await prisma.timetableEntry.deleteMany({ where: { sectionId: section.id, academicYear } });
  await prisma.room.updateMany({ data: { status: "UNAVAILABLE" } });

  req = makeMockRequest({
    departmentId: department.id,
    semester: 5,
    sectionId: section.id,
    academicYear
  });
  res = await POST(req);
  data = await res.json();
  console.log(`  Status: ${res.status} (expected 409)`);
  console.log(`  Error: ${data.error || data.diagnostics?.error}`);

  // Restore rooms
  await prisma.room.updateMany({ data: { status: "AVAILABLE" } });

  // ────────────────────────────────────────────────
  // TEST 9 — Room capacity violation
  // ────────────────────────────────────────────────
  console.log("\nTEST 9: Room capacity violation (all rooms too small)");
  await prisma.timetableEntry.deleteMany({ where: { sectionId: section.id, academicYear } });
  // Set section capacity very high
  await prisma.section.update({ where: { id: section.id }, data: { capacity: 10000 } });

  req = makeMockRequest({
    departmentId: department.id,
    semester: 5,
    sectionId: section.id,
    academicYear
  });
  res = await POST(req);
  data = await res.json();
  console.log(`  Status: ${res.status} (expected 409)`);
  console.log(`  Error: ${data.error || data.diagnostics?.error}`);

  // Restore section capacity
  await prisma.section.update({ where: { id: section.id }, data: { capacity: 60 } });

  // ────────────────────────────────────────────────
  // TEST 10 — Missing input validation
  // ────────────────────────────────────────────────
  console.log("\nTEST 10: Missing required fields");
  req = makeMockRequest({});
  res = await POST(req);
  data = await res.json();
  console.log(`  Status: ${res.status} (expected 400)`);
  console.log(`  Error: ${data.error}`);

  // ────────────────────────────────────────────────
  // TEST 11 — Invalid semester range
  // ────────────────────────────────────────────────
  console.log("\nTEST 11: Invalid semester (99)");
  req = makeMockRequest({
    departmentId: department.id,
    semester: 99,
    sectionId: section.id,
    academicYear
  });
  res = await POST(req);
  data = await res.json();
  console.log(`  Status: ${res.status} (expected 400)`);
  console.log(`  Error: ${data.error}`);

  // ────────────────────────────────────────────────
  // CLEANUP — remove generated test entries
  // ────────────────────────────────────────────────
  const finalCleanup = await prisma.timetableEntry.deleteMany({
    where: { sectionId: section.id, academicYear }
  });
  console.log(`\nFinal cleanup: deleted ${finalCleanup.count} test entries.`);

  console.log("\n=== ALL TESTS COMPLETE ===");
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
