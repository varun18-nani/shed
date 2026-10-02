#!/usr/bin/env ts-node
/**
 * scripts/test-time-slots.ts
 * Automated tests for TimeSlot validation and overlap checks.
 * Run with: npx tsx scripts/test-time-slots.ts
 *
 * WARNING: This script currently uses the shared production database (db.prisma.io).
 * DO NOT run this in CI/CD until a dedicated test database is configured.
 *
 * SAFETY CONTRACT
 * ──────────────────────────────────────────────────────────────────────────────
 * The database is NOT isolated from production (db.prisma.io).
 * We ONLY delete records by exact IDs that we created during this run.
 * Cleanup runs inside a finally block and always executes.
 *
 * DAY RANGE
 * ──────────────────────────────────────────────────────────────────────────────
 * The application supports dayOfWeek 1-6 (Monday-Saturday).
 * Day 7 (Sunday) is NOT valid. The previous broken test used day 7 by mistake;
 * this file fixes that and uses dayOfWeek: 1 (Monday) for all tests.
 */
import "dotenv/config";
import { hasTimeOverlap, isStartTimeBeforeEndTime, timeToMinutes } from "../lib/timeUtils";
import { POST as createSlot } from "../app/api/timeslots/route";
import { POST as bulkCreateSlots } from "../app/api/timeslots/bulk/route";
import { prisma } from "../lib/prisma";

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const BOLD   = "\x1b[1m";
const RESET  = "\x1b[0m";

let passed = 0;
let failed = 0;

function pass(name: string, detail: string = "") {
  passed++;
  console.log(`  ${GREEN}✓${RESET} ${name}${detail ? `  ${CYAN}(${detail})${RESET}` : ""}`);
}

function fail(name: string, detail: string) {
  failed++;
  console.log(`  ${RED}✗${RESET} ${name}`);
  console.log(`    ${YELLOW}↳ ${detail}${RESET}`);
}

function section(title: string) {
  console.log(`\n${BOLD}${CYAN}── ${title}${RESET}`);
}

// Sentinel time window: 02:xx on dayOfWeek 1 (Monday).
// Real timetables never schedule classes at 2 AM so production collision is
// virtually impossible.
const TEST_DAY   = 1;
const T_A_START  = "02:00"; const T_A_END  = "02:30";
const T_B_START  = "02:20"; const T_B_END  = "02:50"; // partial overlap with A
const T_C_START  = "02:30"; const T_C_END  = "03:00"; // adjacent to A (allowed)
const T_D_START  = "02:05"; const T_D_END  = "02:25"; // contained inside A
const T_E_START  = "03:15"; const T_E_END  = "03:45"; // bulk source sentinel

const makeReq  = (url: string, body: any) => new Request(url, { method: "POST", body: JSON.stringify(body) });
const singleReq = (body: any) => makeReq("http://localhost/api/timeslots", body);
const blkReq    = (body: any) => makeReq("http://localhost/api/timeslots/bulk", body);

async function runTests() {
  console.log(`\n${BOLD}${CYAN}════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}   SchedAI — Time Slots Test Suite              ${RESET}`);
  console.log(`${BOLD}${CYAN}════════════════════════════════════════════════${RESET}\n`);

  const createdIds: string[] = [];
  const createdTimetableEntryIds: string[] = [];

  try { // Master try-finally for cleanup

  // ── 1. lib/timeUtils.ts unit tests (no DB) ───────────────────────────────
  section("1. lib/timeUtils.ts — Unit Tests");
  try {
    timeToMinutes("09:00") === 540
      ? pass('timeToMinutes("09:00") === 540')
      : fail('timeToMinutes("09:00")', `Got ${timeToMinutes("09:00")}`);

    timeToMinutes("00:00") === 0
      ? pass('timeToMinutes("00:00") === 0')
      : fail('timeToMinutes("00:00")', `Got ${timeToMinutes("00:00")}`);

    timeToMinutes("23:59") === 1439
      ? pass('timeToMinutes("23:59") === 1439')
      : fail('timeToMinutes("23:59")', `Got ${timeToMinutes("23:59")}`);

    isNaN(timeToMinutes("25:90"))
      ? pass('timeToMinutes("25:90") → NaN (invalid)')
      : fail('timeToMinutes("25:90")', "Expected NaN");

    isNaN(timeToMinutes("abc"))
      ? pass('timeToMinutes("abc") → NaN (junk)')
      : fail('timeToMinutes("abc")', "Expected NaN");

    isStartTimeBeforeEndTime("09:00","10:00")
      ? pass("isStartTimeBeforeEndTime: 09:00 < 10:00 → true")
      : fail("isStartTimeBeforeEndTime 09:00<10:00","Expected true");

    !isStartTimeBeforeEndTime("10:00","09:00")
      ? pass("isStartTimeBeforeEndTime: 10:00 > 09:00 → false")
      : fail("isStartTimeBeforeEndTime 10:00>09:00","Expected false");

    !isStartTimeBeforeEndTime("10:00","10:00")
      ? pass("isStartTimeBeforeEndTime: equal times → false")
      : fail("isStartTimeBeforeEndTime equal times","Expected false");

    hasTimeOverlap("09:00","10:00","09:30","10:30")
      ? pass("Partial overlap 09:00–10:00 vs 09:30–10:30 → true")
      : fail("Partial overlap","Expected true");

    !hasTimeOverlap("09:00","10:00","10:00","11:00")
      ? pass("Adjacent 09:00–10:00 vs 10:00–11:00 → false (allowed)")
      : fail("Adjacent (end==start)","Expected false — adjacency must NOT be overlap");

    !hasTimeOverlap("09:00","10:00","08:00","09:00")
      ? pass("Adjacent reversed 08:00–09:00 vs 09:00–10:00 → false")
      : fail("Adjacent reversed","Expected false");

    hasTimeOverlap("09:00","11:00","09:30","10:00")
      ? pass("Contained: 09:00–11:00 vs 09:30–10:00 → true")
      : fail("Contained interval","Expected true");

    hasTimeOverlap("09:30","10:00","09:00","11:00")
      ? pass("Contained reversed arg order → true")
      : fail("Contained reversed","Expected true");

    hasTimeOverlap("09:00","10:00","09:00","10:00")
      ? pass("Exact duplicate times → true (overlap)")
      : fail("Exact duplicate","Expected true");

    !hasTimeOverlap("09:00","10:00","11:00","12:00")
      ? pass("Separate non-overlapping intervals → false")
      : fail("Non-overlapping","Expected false");

    // Key correctness test: same times, different slot IDs → still must be detected
    const s1 = { id: "id-X", start: "10:00", end: "11:00" };
    const s2 = { id: "id-Y", start: "10:30", end: "11:30" };
    hasTimeOverlap(s1.start, s1.end, s2.start, s2.end)
      ? pass("Different IDs with overlapping clock times → detected (interval check, not ID)")
      : fail("Different ID overlap","Expected true — generator must use interval check");

  } catch (e: any) {
    fail("timeUtils unit tests threw unexpected error", e.message);
  }

  // ── 2. Individual TimeSlot API ───────────────────────────────────────────
  section("2. Individual TimeSlot API — POST /api/timeslots");
  try {
    // 2.1 Create slot A
    {
      const res  = await createSlot(singleReq({ dayOfWeek: TEST_DAY, startTime: T_A_START, endTime: T_A_END }));
      const data = await res.json();
      if (res.status === 201 && data.id) {
        pass(`Creates valid slot ${T_A_START}–${T_A_END} on day ${TEST_DAY} → 201`);
        createdIds.push(data.id);
      } else {
        fail(`Create valid slot ${T_A_START}–${T_A_END}`, data.error ?? `HTTP ${res.status}`);
      }
    }

    // 2.2 Partial overlap (B overlaps A)
    {
      const res  = await createSlot(singleReq({ dayOfWeek: TEST_DAY, startTime: T_B_START, endTime: T_B_END }));
      const data = await res.json();
      res.status === 409 && data.error?.toLowerCase().includes("overlaps")
        ? pass(`Rejects partial overlap ${T_B_START}–${T_B_END} → 409`)
        : fail(`Partial overlap rejected`, `HTTP ${res.status}: ${data.error}`);
    }

    // 2.3 Contained interval (D inside A)
    {
      const res  = await createSlot(singleReq({ dayOfWeek: TEST_DAY, startTime: T_D_START, endTime: T_D_END }));
      const data = await res.json();
      res.status === 409 && data.error?.toLowerCase().includes("overlaps")
        ? pass(`Rejects contained interval ${T_D_START}–${T_D_END} → 409`)
        : fail(`Contained interval rejected`, `HTTP ${res.status}: ${data.error}`);
    }

    // 2.4 Exact duplicate
    {
      const res  = await createSlot(singleReq({ dayOfWeek: TEST_DAY, startTime: T_A_START, endTime: T_A_END }));
      const data = await res.json();
      res.status === 409
        ? pass(`Rejects exact duplicate ${T_A_START}–${T_A_END} → 409`)
        : fail(`Exact duplicate rejected`, `HTTP ${res.status}: ${data.error}`);
    }

    // 2.5 Adjacent slot C (end of A == start of C → ALLOWED)
    {
      const res  = await createSlot(singleReq({ dayOfWeek: TEST_DAY, startTime: T_C_START, endTime: T_C_END }));
      const data = await res.json();
      if (res.status === 201 && data.id) {
        pass(`Creates adjacent slot ${T_C_START}–${T_C_END} (end==start of prev) → 201`);
        createdIds.push(data.id);
      } else {
        fail(`Adjacent slot allowed`, data.error ?? `HTTP ${res.status}`);
      }
    }

    // 2.6 Invalid time format
    {
      const res  = await createSlot(singleReq({ dayOfWeek: TEST_DAY, startTime: "99:00", endTime: "99:30" }));
      const data = await res.json();
      res.status === 400 && data.error?.includes("HH:MM")
        ? pass("Rejects invalid time format (99:00) → 400")
        : fail("Invalid time format rejected", `HTTP ${res.status}: ${data.error}`);
    }

    // 2.7 Start after end
    {
      const res  = await createSlot(singleReq({ dayOfWeek: TEST_DAY, startTime: "10:00", endTime: "09:00" }));
      const data = await res.json();
      res.status === 400 && data.error?.includes("strictly before")
        ? pass("Rejects start >= end → 400")
        : fail("Start>=end rejected", `HTTP ${res.status}: ${data.error}`);
    }

    // 2.8 Same times on different day (day 2) must be allowed
    {
      const res  = await createSlot(singleReq({ dayOfWeek: 2, startTime: T_A_START, endTime: T_A_END }));
      const data = await res.json();
      if (res.status === 201 && data.id) {
        pass(`Same sentinel times on day 2 (different day) → allowed → 201`);
        createdIds.push(data.id);
      } else {
        fail(`Different-day isolation`, data.error ?? `HTTP ${res.status}`);
      }
    }

  } catch (e: any) {
    fail("Individual TimeSlot API threw unexpected error", e.message);
  }

  // ── 3. Bulk TimeSlot API ─────────────────────────────────────────────────
  section("3. Bulk TimeSlot API — POST /api/timeslots/bulk");
  try {
    // Create source slot E on day 1
    {
      const res  = await createSlot(singleReq({ dayOfWeek: TEST_DAY, startTime: T_E_START, endTime: T_E_END }));
      const data = await res.json();
      if (res.status === 201 && data.id) {
        pass(`Pre-condition: source slot ${T_E_START}–${T_E_END} on day ${TEST_DAY} → 201`);
        createdIds.push(data.id);
      } else {
        fail(`Pre-condition source slot`, data.error ?? `HTTP ${res.status}`);
      }
    }

    // 3.1 Bulk copy day 1 → day 3
    const beforeBulkCount = createdIds.length;
    {
      const res  = await bulkCreateSlots(blkReq({ sourceDay: TEST_DAY, targetDays: [3] }));
      const data = await res.json();
      if (res.status === 200 && typeof data.insertedCount === "number" && data.insertedCount > 0) {
        pass(`Bulk copy day ${TEST_DAY} → day 3: inserted ${data.insertedCount}`);
        const day3 = await prisma.timeSlot.findMany({
          where: { dayOfWeek: 3, startTime: { in: [T_A_START, T_C_START, T_E_START] } }
        });
        for (const s of day3) if (!createdIds.includes(s.id)) createdIds.push(s.id);
      } else {
        fail(`Bulk copy day ${TEST_DAY} → day 3`, data.error ?? data.message ?? `insertedCount=${data.insertedCount}`);
      }
    }

    // 3.2 Repeat bulk copy → all should be skipped as duplicates
    {
      const res  = await bulkCreateSlots(blkReq({ sourceDay: TEST_DAY, targetDays: [3] }));
      const data = await res.json();
      res.status === 200 && data.insertedCount === 0 && data.skippedDuplicates > 0
        ? pass(`Repeat bulk copy: 0 inserted, ${data.skippedDuplicates} skipped as duplicates`)
        : fail(`Repeat bulk skips duplicates`, `inserted=${data.insertedCount} dupes=${data.skippedDuplicates} overlaps=${data.skippedOverlaps}`);
    }

    // 3.3 Create an overlapping slot on day 3, then copy an overlapping source
    //     and confirm it is skipped
    const overSlot = await prisma.timeSlot.create({
      data: { dayOfWeek: 3, startTime: "02:50", endTime: "03:20" }
    });
    createdIds.push(overSlot.id);

    const overSrc = await prisma.timeSlot.create({
      data: { dayOfWeek: 4, startTime: "02:55", endTime: "03:25" }
    });
    createdIds.push(overSrc.id);

    {
      const res  = await bulkCreateSlots(blkReq({ sourceDay: 4, targetDays: [3] }));
      const data = await res.json();
      res.status === 200 && data.skippedOverlaps >= 1
        ? pass(`Bulk copy skips overlapping slot (skippedOverlaps=${data.skippedOverlaps})`)
        : fail(`Bulk copy skips overlap`, `skippedOverlaps=${data.skippedOverlaps} inserted=${data.insertedCount}`);
    }

    // 3.4 Missing sourceDay → 400
    {
      const res  = await bulkCreateSlots(blkReq({ targetDays: [3] }));
      res.status === 400
        ? pass("Bulk copy missing sourceDay → 400")
        : fail("Bulk missing sourceDay", `HTTP ${res.status}`);
    }

  } catch (e: any) {
    fail("Bulk TimeSlot API threw unexpected error", e.message);
  }

  // ── 4. Generator conflict logic (in-memory simulation) ───────────────────
  section("4. Generator interval conflict logic — structural verification");
  try {
    type SlotLike = { id: string; dayOfWeek: number; startTime: string; endTime: string };
    const occ: Record<string, SlotLike[]> = {};
    const add = (res: string, s: SlotLike) => { const k=`${res}_${s.dayOfWeek}`; if(!occ[k])occ[k]=[]; occ[k].push(s); };
    const chk = (res: string, s: SlotLike) => (occ[`${res}_${s.dayOfWeek}`]??[]).some(ex=>hasTimeOverlap(s.startTime,s.endTime,ex.startTime,ex.endTime));

    const f = "fac-1";
    const sX: SlotLike = { id:"x", dayOfWeek:1, startTime:"09:00", endTime:"10:00" };
    const sY: SlotLike = { id:"y", dayOfWeek:1, startTime:"09:30", endTime:"10:30" }; // overlaps X
    const sZ: SlotLike = { id:"z", dayOfWeek:1, startTime:"10:00", endTime:"11:00" }; // adjacent
    const sW: SlotLike = { id:"w", dayOfWeek:2, startTime:"09:00", endTime:"10:00" }; // diff day
    const sX2: SlotLike= { id:"x2",dayOfWeek:1, startTime:"09:00", endTime:"10:00" }; // same times, diff ID

    add(f, sX);

    chk(f, sX2)
      ? pass("Faculty conflict: different ID, same time range → occupied (interval, not ID match)")
      : fail("Different ID same time", "Expected true");

    chk(f, sY)
      ? pass("Faculty conflict: partial overlap (sY 09:30–10:30 overlaps sX 09:00–10:00)")
      : fail("Partial overlap in generator", "Expected true");

    !chk(f, sZ)
      ? pass("Faculty conflict: adjacent slot sZ 10:00–11:00 → not blocked")
      : fail("Adjacent in generator", "Expected false");

    !chk(f, sW)
      ? pass("Faculty conflict: same times different day → not blocked")
      : fail("Different day in generator", "Expected false");

    // Legacy overlap: two DB slots with overlapping times, different IDs
    const leg1: SlotLike = { id:"leg1", dayOfWeek:3, startTime:"14:00", endTime:"15:00" };
    const leg2: SlotLike = { id:"leg2", dayOfWeek:3, startTime:"14:30", endTime:"15:30" };
    const occR: Record<string,SlotLike[]> = {};
    const addR = (r:string,s:SlotLike) => { const k=`${r}_${s.dayOfWeek}`; if(!occR[k])occR[k]=[]; occR[k].push(s); };
    const chkR = (r:string,s:SlotLike) => (occR[`${r}_${s.dayOfWeek}`]??[]).some(ex=>hasTimeOverlap(s.startTime,s.endTime,ex.startTime,ex.endTime));

    addR("roomA", leg1);
    chkR("roomA", leg2)
      ? pass("Legacy overlap: room with leg1 blocks leg2 even though IDs differ")
      : fail("Legacy overlap room check", "Expected true");

    // Backtrack: remove and confirm slot is unblocked
    occR["roomA_3"] = [];
    !chkR("roomA", leg2)
      ? pass("After backtrack: room is unblocked")
      : fail("After backtrack unblocked", "Expected false");

  } catch (e: any) {
    fail("Generator logic tests threw unexpected error", e.message);
  }

  // ── 4.5. Malformed POST API Tests ─────────────────────────────────────────
  section("4.5. Malformed POST API Tests");
  try {
    // 4.5.1 Empty body
    const emptyRes = await createSlot(new Request("http://localhost/api/timeslots", { method: "POST", body: "" }));
    emptyRes.status === 400 || emptyRes.status === 500
      ? pass("Empty request body rejected")
      : fail("Empty request body rejected", `HTTP ${emptyRes.status}`);

    // 4.5.2 Missing dayOfWeek
    const noDay = await createSlot(singleReq({ startTime: T_A_START, endTime: T_A_END }));
    noDay.status === 400
      ? pass("Missing dayOfWeek rejected")
      : fail("Missing dayOfWeek rejected", `HTTP ${noDay.status}`);

    // 4.5.3 Missing startTime
    const noStart = await createSlot(singleReq({ dayOfWeek: TEST_DAY, endTime: T_A_END }));
    noStart.status === 400
      ? pass("Missing startTime rejected")
      : fail("Missing startTime rejected", `HTTP ${noStart.status}`);

    // 4.5.4 Missing endTime
    const noEnd = await createSlot(singleReq({ dayOfWeek: TEST_DAY, startTime: T_A_START }));
    noEnd.status === 400
      ? pass("Missing endTime rejected")
      : fail("Missing endTime rejected", `HTTP ${noEnd.status}`);

    // 4.5.5 Invalid dayOfWeek outside 1-6
    const invalidDay = await createSlot(singleReq({ dayOfWeek: 8, startTime: T_A_START, endTime: T_A_END }));
    invalidDay.status === 400
      ? pass("Invalid dayOfWeek 8 rejected (400)")
      : fail("Invalid dayOfWeek 8 rejected", `HTTP ${invalidDay.status}`);

    const invalidDay7 = await createSlot(singleReq({ dayOfWeek: 7, startTime: T_A_START, endTime: T_A_END }));
    invalidDay7.status === 400
      ? pass("Invalid dayOfWeek 7 rejected (400)")
      : fail("Invalid dayOfWeek 7 rejected", `HTTP ${invalidDay7.status}`);

    const invalidDay0 = await createSlot(singleReq({ dayOfWeek: 0, startTime: T_A_START, endTime: T_A_END }));
    invalidDay0.status === 400
      ? pass("Invalid dayOfWeek 0 rejected (400)")
      : fail("Invalid dayOfWeek 0 rejected", `HTTP ${invalidDay0.status}`);

    const negDay = await createSlot(singleReq({ dayOfWeek: -1, startTime: T_A_START, endTime: T_A_END }));
    negDay.status === 400
      ? pass("Negative dayOfWeek rejected (400)")
      : fail("Negative dayOfWeek rejected", `HTTP ${negDay.status}`);

    const decimalDay = await createSlot(singleReq({ dayOfWeek: 1.5, startTime: T_A_START, endTime: T_A_END }));
    decimalDay.status === 400
      ? pass("Decimal dayOfWeek rejected (400)")
      : fail("Decimal dayOfWeek rejected", `HTTP ${decimalDay.status}`);

    const strDay = await createSlot(singleReq({ dayOfWeek: "Monday", startTime: T_A_START, endTime: T_A_END }));
    strDay.status === 400
      ? pass("Non-numeric dayOfWeek rejected (400)")
      : fail("Non-numeric dayOfWeek rejected", `HTTP ${strDay.status}`);

    // Bulk endpoint invalid days
    const bulkInvalid = await bulkCreateSlots(blkReq({ sourceDay: 7, targetDays: [1, 2] }));
    bulkInvalid.status === 400
      ? pass("Bulk sourceDay 7 rejected")
      : fail("Bulk sourceDay 7 rejected", `HTTP ${bulkInvalid.status}`);

    const bulkInvalidTarget = await bulkCreateSlots(blkReq({ sourceDay: 1, targetDays: [2, 8] }));
    bulkInvalidTarget.status === 400
      ? pass("Bulk targetDays containing 8 rejected")
      : fail("Bulk targetDays containing 8 rejected", `HTTP ${bulkInvalidTarget.status}`);
  } catch (e: any) {
    fail("Malformed POST tests threw unexpected error", e.message);
  }

  // ── 4.6. DELETE API Tests ────────────────────────────────────────────────
  section("4.6. DELETE API Tests");
  try {
    const delReq = (id: string) => new Request("http://localhost/api/timeslots", { method: "DELETE", body: JSON.stringify({ id }) });
    const API = await import("../app/api/timeslots/route");
    
    // 4.6.1 Deleting an unused slot
    const unusedRes = await createSlot(singleReq({ dayOfWeek: TEST_DAY, startTime: "04:00", endTime: "04:30" }));
    const unusedData = await unusedRes.json();
    if (unusedRes.status === 201 && unusedData.id) {
      createdIds.push(unusedData.id);
      const del1 = await API.DELETE(delReq(unusedData.id));
      del1.status === 200
        ? pass("Deleting an unused slot succeeds")
        : fail("Deleting unused slot", `HTTP ${del1.status}`);
    } else {
      fail("Setup delete slot failed", "");
    }

    // 4.6.2 Deleting a slot referenced by a TimetableEntry returns HTTP 409
    const inUseRes = await createSlot(singleReq({ dayOfWeek: TEST_DAY, startTime: "04:30", endTime: "05:00" }));
    const inUseData = await inUseRes.json();
    if (inUseRes.status === 201 && inUseData.id) {
      createdIds.push(inUseData.id);
      
      const subject = await prisma.subject.findFirst();
      const faculty = await prisma.faculty.findFirst();
      const room = await prisma.room.findFirst();
      
        if (subject && faculty && room) {
        const tb = await prisma.timetableEntry.create({
          data: {
            subjectId: subject.id,
            facultyId: faculty.id,
            roomId: room.id,
            timeSlotId: inUseData.id,
            academicYear: "2026-27",
            status: "DRAFT"
          }
        });
        createdTimetableEntryIds.push(tb.id);
        
        const del2 = await API.DELETE(delReq(inUseData.id));
        del2.status === 409
          ? pass("Deleting a slot referenced by TimetableEntry returns HTTP 409")
          : fail("Deleting referenced slot", `HTTP ${del2.status}`);
          
        const tbCheck = await prisma.timetableEntry.findUnique({ where: { id: tb.id } });
        if (tbCheck && tbCheck.timeSlotId === inUseData.id) {
          pass("Referenced timetable entry remains unchanged");
        } else {
          fail("Referenced timetable entry unchanged", "Missing or altered");
        }
      } else {
        console.log(`  ${YELLOW}⚠${RESET} Skipping 4.6.2 due to missing seed data`);
      }
    }
  } catch (e: any) {
    fail("DELETE API tests threw unexpected error", e.message);
  }

  } finally {
    // ── 5. Cleanup (always runs) ─────────────────────────────────────────────
    section("5. Cleanup");
    const uniqueTbIds = [...new Set(createdTimetableEntryIds)];
    try {
      if (uniqueTbIds.length > 0) {
        const r = await prisma.timetableEntry.deleteMany({ where: { id: { in: uniqueTbIds } } });
        pass(`Deleted ${r.count} of ${uniqueTbIds.length} dummy TimetableEntry record(s) by exact ID`);
      }
    } catch (e: any) {
      fail("TimetableEntry Cleanup failed", e.message);
      console.log(`  ${YELLOW}    TimetableEntry IDs requiring manual cleanup:${RESET}`);
      uniqueTbIds.forEach(id => console.log(`  ${YELLOW}    ${id}${RESET}`));
    }

    const uniqueIds = [...new Set(createdIds)];
    try {
      if (uniqueIds.length > 0) {
        const r = await prisma.timeSlot.deleteMany({ where: { id: { in: uniqueIds } } });
        pass(`Deleted ${r.count} of ${uniqueIds.length} test TimeSlot record(s) by exact ID`);
      } else {
        pass("No TimeSlot records created — nothing to clean up");
      }
    } catch (e: any) {
      fail("TimeSlot Cleanup failed", e.message);
      console.log(`  ${YELLOW}    IDs requiring manual cleanup:${RESET}`);
      uniqueIds.forEach(id => console.log(`  ${YELLOW}    ${id}${RESET}`));
    }

    console.log(`\n${BOLD}Results: ${GREEN}${passed} passed${RESET}, ${RED}${failed} failed${RESET}\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests().catch(e => { console.error("Unhandled error:", e); process.exit(1); });

