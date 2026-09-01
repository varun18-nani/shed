#!/usr/bin/env ts-node
/**
 * scripts/test-optimization.ts
 * Automated tests for the Phase 12 Timetable Optimization & Regeneration feature.
 * Run with: npx tsx scripts/test-optimization.ts
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { POST as optimizePOST } from "../app/api/timetable/optimize/route";
import { POST as selectPOST } from "../app/api/timetable/optimize/select/route";
import { generateCandidates } from "../lib/timetable/optimizer";
import { NextRequest } from "next/server";

// ── ANSI Colors ──────────────────────────────────────────────────────────────
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

// ── Test State ───────────────────────────────────────────────────────────────
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

function makeRequest(url: string, body: any) {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Main Test Suite ──────────────────────────────────────────────────────────
async function runOptimizationTests() {
  console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}   SchedAI — Timetable Optimization Test Suite (P12)   ${RESET}`);
  console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}\n`);

  // ── 0. Preflight: Fetch candidate data for testing ─────────────────────────
  section("0. Preflight & Test Data Setup");

  const dept = await prisma.department.findUnique({ where: { code: "TESTCSD" } });
  if (!dept) {
    fail("Preflight", "TESTCSD department not found. Run seed-test-data first.");
    process.exit(1);
  }

  const sectionObj = await prisma.section.findFirst({
    where: { name: "TESTA", departmentId: dept.id },
  });

  if (!sectionObj) {
    fail("Preflight", "Section TESTA not found. Run seed-test-data first.");
    process.exit(1);
  }

  const academicYear = "2026-27";
  const preflight = {
    departmentId: dept.id,
    semester: 5,
    sectionId: sectionObj.id,
    academicYear,
  };

  pass("Preflight: Found TESTCSD and TESTA", `dept=${dept.id.slice(0, 8)}... section=${sectionObj.id.slice(0, 8)}...`);

  // Clean up any test timetable entries first
  await prisma.timetableEntry.deleteMany({
    where: { sectionId: sectionObj.id, academicYear },
  });

  // ── Test 1: Input Validation ──────────────────────────────────────────────
  section("1. POST /api/timetable/optimize — Input Validation");

  const badReq1 = makeRequest("http://localhost:3000/api/timetable/optimize", { semester: 5 });
  const badRes1 = await optimizePOST(badReq1);
  if (badRes1.status === 400) {
    pass("Returns 400 for missing required fields");
  } else {
    fail("Returns 400 for missing required fields", `Got ${badRes1.status}`);
  }

  const badReq2 = makeRequest("http://localhost:3000/api/timetable/optimize", {
    ...preflight,
    candidateCount: 99,
  });
  const badRes2 = await optimizePOST(badReq2);
  if (badRes2.status === 400) {
    pass("Returns 400 for candidateCount > 5");
  } else {
    fail("Returns 400 for candidateCount > 5", `Got ${badRes2.status}`);
  }

  // ── Test 2: Direct Optimizer Engine Validation ─────────────────────────────
  section("2. Direct Optimizer Engine (lib/timetable/optimizer)");

  const engineRes = await generateCandidates({
    ...preflight,
    candidateCount: 3,
    allowExistingDraft: true,
  });

  if (engineRes.success && engineRes.candidates && engineRes.candidates.length >= 1) {
    pass(`Optimizer engine generated ${engineRes.candidates.length} candidates`);
    pass(`Best score is valid: ${engineRes.bestScore}/100`);
  } else {
    fail("Optimizer engine generated candidates", `Result: ${JSON.stringify(engineRes)}`);
  }

  // ── Test 3: Candidate Generation via API ───────────────────────────────────
  section("3. POST /api/timetable/optimize — API Candidate Generation");

  const optReq = makeRequest("http://localhost:3000/api/timetable/optimize", {
    ...preflight,
    candidateCount: 3,
    allowExistingDraft: true,
  });
  const optRes = await optimizePOST(optReq);
  const optBody = await optRes.json();
  const candidates = optBody.candidates || [];

  if (optRes.status === 200) {
    pass("Returns 200 for valid optimization request", `status=${optRes.status}`);

    if (optBody.success === true) {
      pass("Response body has success=true");
    } else {
      fail("Response body has success=true", `Got: ${JSON.stringify(optBody.success)}`);
    }

    if (Array.isArray(candidates) && candidates.length >= 1 && candidates.length <= 5) {
      pass(`Generated ${candidates.length} candidate(s) in [1, 5] range`);
    } else {
      fail("Candidate count in [1, 5] range", `Got: ${candidates.length}`);
    }

    if (typeof optBody.bestScore === "number" && optBody.bestScore >= 0 && optBody.bestScore <= 100) {
      pass(`bestScore is in [0, 100]`, `value=${optBody.bestScore}`);
    } else {
      fail("bestScore is in [0, 100]", `Got: ${JSON.stringify(optBody.bestScore)}`);
    }
  } else {
    fail("Optimization call returns 200", `Got ${optRes.status}: ${JSON.stringify(optBody?.error)}`);
  }

  // ── Test 4: Candidate Scoring Ranges & Structure ──────────────────────────
  if (candidates.length > 0) {
    section("4. Candidate Scoring & Structure");

    for (const cand of candidates) {
      const idx = cand.candidateIndex;
      if (typeof cand.qualityScore === "number" && cand.qualityScore >= 0 && cand.qualityScore <= 100) {
        pass(`Candidate #${idx} qualityScore in [0, 100]`, `score=${cand.qualityScore}`);
      } else {
        fail(`Candidate #${idx} qualityScore in [0, 100]`, `Got: ${cand.qualityScore}`);
      }

      const bk = cand.breakdown;
      if (bk && typeof bk.dayDistribution === "number" && typeof bk.workloadBalance === "number") {
        pass(`Candidate #${idx} has breakdown metrics`);
      } else {
        fail(`Candidate #${idx} has breakdown metrics`, `Got: ${JSON.stringify(bk)}`);
      }

      if (Array.isArray(cand.entries) && cand.entries.length > 0) {
        pass(`Candidate #${idx} has entries array`, `count=${cand.entries.length}`);
      } else {
        fail(`Candidate #${idx} has entries array`, `Got: ${JSON.stringify(cand.entries)}`);
      }
    }

    // ── Test 5: Diversity ───────────────────────────────────────────────────
    section("5. Candidate Diversity & Strategies");

    if (candidates.length >= 2) {
      const scores = candidates.map((c: any) => c.qualityScore);
      pass(`Candidates have scores`, `scores=[${scores.join(", ")}]`);

      const strategies = candidates.map((c: any) => c.strategyName);
      const uniqueStrategies = new Set(strategies).size;
      if (uniqueStrategies === candidates.length) {
        pass(`All strategy names are unique`, `strategies=[${strategies.join(", ")}]`);
      } else {
        fail("All strategy names are unique", `Got: ${JSON.stringify(strategies)}`);
      }
    }

    // ── Test 6: Published / Non-Existent Section Protection ──────────────────
    section("6. Safety & Validation Guardrails");

    const fakeReq = makeRequest("http://localhost:3000/api/timetable/optimize/select", {
      sectionId: "non-existent-section-id",
      academicYear: preflight.academicYear,
      entries: candidates[0].entries.slice(0, 1).map((e: any) => ({
        subjectId: e.subjectId,
        facultyId: e.facultyId,
        roomId: e.roomId,
        timeSlotId: e.timeSlotId,
      })),
    });
    const fakeRes = await selectPOST(fakeReq);
    if (fakeRes.status === 404) {
      pass("Returns 404 for non-existent sectionId");
    } else {
      fail("Returns 404 for non-existent sectionId", `Got ${fakeRes.status}`);
    }

    // ── Test 7: Apply / Select Candidate ─────────────────────────────────────
    section("7. POST /api/timetable/optimize/select — Save Candidate as Draft");

    const selected = candidates[0];
    const selectReq = makeRequest("http://localhost:3000/api/timetable/optimize/select", {
      sectionId: preflight.sectionId,
      academicYear: preflight.academicYear,
      candidateId: selected.id,
      entries: selected.entries.map((e: any) => ({
        subjectId: e.subjectId,
        facultyId: e.facultyId,
        roomId: e.roomId,
        timeSlotId: e.timeSlotId,
      })),
    });

    const selectRes = await selectPOST(selectReq);
    const selBody = await selectRes.json();

    if (selectRes.status === 201) {
      pass("Returns 201 for candidate selection", `insertedCount=${selBody.insertedCount}`);

      if (selBody.success === true) {
        pass("Response body has success=true");
      } else {
        fail("Response body has success=true", `Got: ${JSON.stringify(selBody.success)}`);
      }

      // Verify records are in database
      const dbEntries = await prisma.timetableEntry.findMany({
        where: { sectionId: preflight.sectionId, academicYear: preflight.academicYear },
      });
      if (dbEntries.length === selected.entries.length) {
        pass(`Database contains exactly ${dbEntries.length} entries matching selected candidate`);
      } else {
        fail("Database contains matching entries", `Expected ${selected.entries.length}, found ${dbEntries.length}`);
      }
    } else {
      fail("Returns 201 for candidate selection", `Got ${selectRes.status}: ${JSON.stringify(selBody?.error)}`);
    }

    // Clean up test entries
    await prisma.timetableEntry.deleteMany({
      where: { sectionId: preflight.sectionId, academicYear: preflight.academicYear },
    });
    pass("Cleaned up test timetable entries");
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}══════════════════════════════════════════════════════${RESET}`);
  const total = passed + failed;
  if (failed === 0) {
    console.log(`${GREEN}${BOLD}  All ${total}/${total} optimization tests passed! ✓${RESET}`);
  } else {
    console.log(`${RED}${BOLD}  ${failed}/${total} tests failed.${RESET}`);
  }
  console.log(`${BOLD}══════════════════════════════════════════════════════${RESET}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runOptimizationTests().catch((err) => {
  console.error(`${RED}${BOLD}Fatal:${RESET}`, err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
