#!/usr/bin/env ts-node
/**
 * scripts/test-health.ts
 * Automated tests for the GET /api/health endpoint.
 * Run with: npx tsx scripts/test-health.ts
 */
import "dotenv/config";
import { GET as healthGET } from "../app/api/health/route";
import { NextRequest } from "next/server";

// ── ANSI Colors ──────────────────────────────────────────────────────────────
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

// ── Test Helpers ─────────────────────────────────────────────────────────────
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

// ── Tests ─────────────────────────────────────────────────────────────────────
async function runHealthTests() {
  console.log(`\n${BOLD}${CYAN}════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}   SchedAI — Health Check Endpoint Test Suite   ${RESET}`);
  console.log(`${BOLD}${CYAN}════════════════════════════════════════════════${RESET}\n`);

  // ── Test 1: HTTP 200 Response ───────────────────────────────────────────
  section("1. Basic Availability");

  const req1 = new NextRequest(new URL("http://localhost:3000/api/health"), {
    method: "GET",
  });

  const res = await healthGET(req1);
  const body = await res.json();

  if (res.status === 200) {
    pass("HTTP 200 OK", `status=${res.status}`);
  } else {
    fail("HTTP 200 OK", `Expected 200, got ${res.status}`);
  }

  // ── Test 2: Response Shape ───────────────────────────────────────────────
  section("2. Response Shape");

  if (body && body.status === "ok") {
    pass("body.status === 'ok'");
  } else {
    fail("body.status === 'ok'", `Got: ${JSON.stringify(body?.status)}`);
  }

  if (body && typeof body.timestamp === "string" && !isNaN(Date.parse(body.timestamp))) {
    pass("body.timestamp is a valid ISO string", `value=${body.timestamp}`);
  } else {
    fail("body.timestamp is a valid ISO string", `Got: ${JSON.stringify(body?.timestamp)}`);
  }

  if (body && body.database && body.database.status === "connected") {
    pass("body.database.status === 'connected'");
  } else {
    fail("body.database.status === 'connected'", `Got: ${JSON.stringify(body?.database)}`);
  }

  // ── Test 3: Database Latency ─────────────────────────────────────────────
  section("3. Database Latency");

  if (body?.database && typeof body.database.latencyMs === "number") {
    const lat = body.database.latencyMs;
    if (lat >= 0) {
      pass(
        `body.database.latencyMs is a non-negative number`,
        lat < 100 ? `${lat}ms (excellent)` : lat < 500 ? `${lat}ms (good)` : `${lat}ms (slow)`
      );
    } else {
      fail("body.database.latencyMs >= 0", `Got: ${lat}`);
    }
  } else {
    fail("body.database.latencyMs is present", `Got: ${JSON.stringify(body?.database?.latencyMs)}`);
  }

  // ── Test 4: X-Request-ID Header ─────────────────────────────────────────
  section("4. X-Request-ID Header");

  const requestId = res.headers.get("x-request-id");
  if (requestId && requestId.length > 8) {
    pass("X-Request-ID header is present and non-empty", `value=${requestId}`);
  } else {
    fail("X-Request-ID header is present", `Got: ${requestId}`);
  }

  // ── Test 5: X-Request-ID Roundtrip ──────────────────────────────────────
  section("5. Custom X-Request-ID Roundtrip");

  const myId = "test-req-abc123";
  const req2 = new NextRequest(new URL("http://localhost:3000/api/health"), {
    method: "GET",
    headers: { "X-Request-ID": myId },
  });
  const res2 = await healthGET(req2);
  const returnedId = res2.headers.get("x-request-id");
  if (returnedId === myId) {
    pass(`Custom X-Request-ID echoed back`, `sent=${myId} got=${returnedId}`);
  } else {
    fail("Custom X-Request-ID echoed back", `Sent: ${myId}, Got: ${returnedId}`);
  }

  // ── Test 6: No Auth Required ─────────────────────────────────────────────
  section("6. Public Access (No JWT Required)");

  if (res.status === 200) {
    pass("Health endpoint accessible without JWT", `status=${res.status}`);
  } else {
    fail("Health endpoint accessible without JWT", `Got ${res.status}`);
  }

  // ── Test 7: Environment Field ────────────────────────────────────────────
  section("7. Environment Information");

  if (body && body.environment !== undefined) {
    pass(`body.environment is present`, `value=${body.environment}`);
  } else {
    console.log(`  ${YELLOW}-${RESET} body.environment not present (optional field — skipped)`);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}════════════════════════════════════════════════${RESET}`);
  const total = passed + failed;
  if (failed === 0) {
    console.log(`${GREEN}${BOLD}  All ${total}/${total} health tests passed! ✓${RESET}`);
  } else {
    console.log(`${RED}${BOLD}  ${failed}/${total} tests failed. Fix the health endpoint and retry.${RESET}`);
  }
  console.log(`${BOLD}════════════════════════════════════════════════${RESET}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runHealthTests().catch((err) => {
  console.error(`${RED}${BOLD}Fatal:${RESET}`, err);
  process.exit(1);
});
