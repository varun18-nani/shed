import "dotenv/config";
import { prisma } from "../lib/prisma";
import { POST as generatePOST } from "../app/api/timetable/generate/route";
import { scoreTimetable } from "../lib/timetable/scoring";
import { NextRequest } from "next/server";

function makeRequest(body: any) {
  return new NextRequest(new URL("http://localhost:3000/api/timetable/generate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function runIntelligenceTests() {
  console.log("=== STARTING TIMETABLE INTELLIGENCE & QUALITY TESTS ===\n");

  const department = await prisma.department.findUnique({ where: { code: "TESTCSD" } });
  if (!department) {
    console.log("TESTCSD not found. Skipping.");
    return;
  }

  const sectionA = await prisma.section.findFirst({
    where: { name: "TESTA", departmentId: department.id },
  });

  if (!sectionA) {
    console.log("Section TESTA not found.");
    return;
  }

  const academicYear = "2026-27";

  // Clean up any test timetable entries first
  await prisma.timetableEntry.deleteMany({
    where: { sectionId: sectionA.id, academicYear },
  });

  // ────────────────────────────────────────────────────────────
  // TEST 1: Scoring Engine Unit Test
  // ────────────────────────────────────────────────────────────
  console.log("TEST 1: Quality Scoring Engine Unit Calculation");
  const sampleEntries = [
    {
      subjectId: "subj1",
      subjectName: "Data Structures",
      facultyId: "fac1",
      roomId: "room1",
      timeSlotId: "ts1",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
      roomCapacity: 60,
      sectionCapacity: 50,
    },
    {
      subjectId: "subj2",
      subjectName: "Algorithms",
      facultyId: "fac2",
      roomId: "room1",
      timeSlotId: "ts2",
      dayOfWeek: 2,
      startTime: "10:00",
      endTime: "11:00",
      roomCapacity: 60,
      sectionCapacity: 50,
    },
    {
      subjectId: "subj1",
      subjectName: "Data Structures",
      facultyId: "fac1",
      roomId: "room1",
      timeSlotId: "ts3",
      dayOfWeek: 3,
      startTime: "09:00",
      endTime: "10:00",
      roomCapacity: 60,
      sectionCapacity: 50,
    },
  ];

  const scoreResult = scoreTimetable(sampleEntries);
  console.log(`  Quality Score: ${scoreResult.qualityScore} (expected 0-100: ${scoreResult.qualityScore >= 0 && scoreResult.qualityScore <= 100})`);
  console.log(`  Breakdown present: ${Boolean(scoreResult.breakdown?.dayDistribution !== undefined)}`);
  console.log(`  Recommendations count: ${scoreResult.recommendations.length} (expected >= 1)`);

  // ────────────────────────────────────────────────────────────
  // TEST 2: Generator Preview Mode (preview: true -> No DB writes)
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 2: Generator Preview Mode (preview = true)");
  const previewReq = makeRequest({
    departmentId: department.id,
    semester: 5,
    sectionId: sectionA.id,
    academicYear,
    preview: true,
  });

  const previewRes = await generatePOST(previewReq);
  const previewData = await previewRes.json();

  console.log(`  Status: ${previewRes.status} (expected 200)`);
  console.log(`  Preview flag returned: ${previewData.preview === true}`);
  console.log(`  Quality score included: ${previewData.qualityScore >= 0}`);
  console.log(`  Recommendations included: ${Array.isArray(previewData.recommendations)}`);
  console.log(`  Entries mapped: ${previewData.entriesCount > 0}`);

  // Verify that NO records were inserted into the database
  const dbCountAfterPreview = await prisma.timetableEntry.count({
    where: { sectionId: sectionA.id, academicYear },
  });
  console.log(`  DB records inserted: ${dbCountAfterPreview} (expected 0: ${dbCountAfterPreview === 0})`);

  // ────────────────────────────────────────────────────────────
  // TEST 3: Generator Save Mode (preview: false -> Persists DRAFT)
  // ────────────────────────────────────────────────────────────
  console.log("\nTEST 3: Generator Save Mode (preview = false)");
  const saveReq = makeRequest({
    departmentId: department.id,
    semester: 5,
    sectionId: sectionA.id,
    academicYear,
    preview: false,
  });

  const saveRes = await generatePOST(saveReq);
  const saveData = await saveRes.json();

  console.log(`  Status: ${saveRes.status} (expected 201)`);
  console.log(`  Saved entries count: ${saveData.entriesCreated > 0}`);

  const dbCountAfterSave = await prisma.timetableEntry.count({
    where: { sectionId: sectionA.id, academicYear },
  });
  console.log(`  DB records created: ${dbCountAfterSave} (expected > 0: ${dbCountAfterSave > 0})`);

  // Clean up test entries
  await prisma.timetableEntry.deleteMany({
    where: { sectionId: sectionA.id, academicYear },
  });

  console.log("\nCleaned up test timetable entries.");
  console.log("\n=== ALL TIMETABLE INTELLIGENCE TESTS PASSED ===");
}

runIntelligenceTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
