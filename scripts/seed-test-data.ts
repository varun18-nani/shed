import "dotenv/config";
import { prisma } from "../lib/prisma";

/**
 * Seeds test data for the timetable generator tests.
 * Creates: 1 department, 1 section, 3 faculty, 3 subjects, 5 rooms, 30 timeslots
 */
async function seedTestData() {
  console.log("=== SEEDING GENERATOR TEST DATA ===\n");

  // 1. Department
  let dept = await prisma.department.findUnique({ where: { code: "TESTCSD" } });
  if (!dept) {
    dept = await prisma.department.create({
      data: { name: "Test Computer Science", code: "TESTCSD" }
    });
    console.log(`Created department: ${dept.code} (${dept.id})`);
  } else {
    console.log(`Department already exists: ${dept.code} (${dept.id})`);
  }

  // 2. Faculty (3 members)
  const facultyData = [
    { employeeId: "TFAC001", firstName: "Test", lastName: "FacultyA", email: "testfaca@schedai.com" },
    { employeeId: "TFAC002", firstName: "Test", lastName: "FacultyB", email: "testfacb@schedai.com" },
    { employeeId: "TFAC003", firstName: "Test", lastName: "FacultyC", email: "testfacc@schedai.com" },
  ];

  const facultyIds: string[] = [];
  for (const f of facultyData) {
    let existing = await prisma.faculty.findUnique({ where: { employeeId: f.employeeId } });
    if (!existing) {
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash("testpassword123", 12);
      const user = await prisma.user.create({
        data: {
          email: f.email,
          passwordHash: hash,
          role: "FACULTY",
          firstName: f.firstName,
          lastName: f.lastName,
          isActive: true,
        }
      });
      existing = await prisma.faculty.create({
        data: {
          employeeId: f.employeeId,
          departmentId: dept.id,
          userId: user.id,
        }
      });
      console.log(`Created faculty: ${f.employeeId} (${existing.id})`);
    } else {
      console.log(`Faculty already exists: ${f.employeeId} (${existing.id})`);
    }
    facultyIds.push(existing.id);
  }

  // 3. Section
  let section = await prisma.section.findFirst({
    where: { name: "TESTA", semester: 5, departmentId: dept.id }
  });
  if (!section) {
    section = await prisma.section.create({
      data: { name: "TESTA", semester: 5, departmentId: dept.id, capacity: 60 }
    });
    console.log(`Created section: ${section.name} (${section.id})`);
  } else {
    console.log(`Section already exists: ${section.name} (${section.id})`);
  }

  // 4. Subjects (3 subjects, semester 5, assigned to faculty)
  const subjectData = [
    { code: "TCS501", name: "Test Data Structures", credits: 3, facultyIdx: 0 },
    { code: "TCS502", name: "Test Database Systems", credits: 4, facultyIdx: 1 },
    { code: "TCS503", name: "Test Operating Systems", credits: 3, facultyIdx: 2 },
  ];

  for (const s of subjectData) {
    let existing = await prisma.subject.findUnique({ where: { code: s.code } });
    if (!existing) {
      existing = await prisma.subject.create({
        data: {
          code: s.code,
          name: s.name,
          credits: s.credits,
          semester: 5,
          departmentId: dept.id,
          facultyId: facultyIds[s.facultyIdx],
        }
      });
      console.log(`Created subject: ${s.code} (${existing.id})`);
    } else {
      console.log(`Subject already exists: ${s.code} (${existing.id})`);
    }
  }

  // 5. Rooms (5 rooms, all AVAILABLE)
  const roomData = [
    { roomNumber: "TROOM101", building: "TestBlock-A", type: "CLASSROOM" as const, capacity: 60 },
    { roomNumber: "TROOM102", building: "TestBlock-A", type: "CLASSROOM" as const, capacity: 60 },
    { roomNumber: "TROOM103", building: "TestBlock-A", type: "CLASSROOM" as const, capacity: 80 },
    { roomNumber: "TROOM201", building: "TestBlock-B", type: "COMPUTER_LAB" as const, capacity: 40 },
    { roomNumber: "TROOM202", building: "TestBlock-B", type: "LABORATORY" as const, capacity: 30 },
  ];

  for (const r of roomData) {
    let existing = await prisma.room.findFirst({
      where: { roomNumber: r.roomNumber, building: r.building }
    });
    if (!existing) {
      existing = await prisma.room.create({
        data: { ...r, status: "AVAILABLE", departmentId: dept.id }
      });
      console.log(`Created room: ${r.roomNumber} (${existing.id})`);
    } else {
      console.log(`Room already exists: ${r.roomNumber} (${existing.id})`);
    }
  }

  // 6. TimeSlots (6 slots/day × 5 days = 30 slots)
  const times = [
    { start: "09:00", end: "10:00" },
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" },
    { start: "13:00", end: "14:00" },
    { start: "14:00", end: "15:00" },
    { start: "15:00", end: "16:00" },
  ];

  let slotCount = 0;
  for (let day = 1; day <= 5; day++) {
    for (const t of times) {
      let existing = await prisma.timeSlot.findFirst({
        where: { dayOfWeek: day, startTime: t.start, endTime: t.end }
      });
      if (!existing) {
        await prisma.timeSlot.create({
          data: { dayOfWeek: day, startTime: t.start, endTime: t.end }
        });
        slotCount++;
      }
    }
  }
  console.log(`Created ${slotCount} new time slots (30 total needed).`);

  console.log("\n=== SEED COMPLETE ===");
  console.log(`\nUse these for testing:`);
  console.log(`  departmentId: "${dept.id}"`);
  console.log(`  semester: 5`);
  console.log(`  sectionId: "${section.id}"`);
  console.log(`  academicYear: "2026-27"`);
}

seedTestData().catch(console.error).finally(() => prisma.$disconnect());
