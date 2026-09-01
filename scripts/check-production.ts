import "dotenv/config";


const REQUIRED_VARS: { key: string; hint: string }[] = [
  {
    key: "DATABASE_URL",
    hint:
      "Must be a valid PostgreSQL connection string (e.g. postgresql://user:pass@host:5432/dbname?schema=public)",
  },
  {
    key: "AUTH_SECRET",
    hint:
      "JWT signing secret — must be at least 32 characters in production. Generate with: openssl rand -base64 48",
  },
];

const OPTIONAL_VARS: { key: string; hint: string; productionWarning?: boolean }[] = [
  {
    key: "NODE_ENV",
    hint: "Should be 'production' in production. Currently: " + (process.env.NODE_ENV || "(not set)"),
    productionWarning: process.env.NODE_ENV !== "production",
  },
  {
    key: "PORT",
    hint: "HTTP port number (default: 3000).",
  },
];

// ── ANSI Colors ──────────────────────────────────────────────────────────────
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function pass(label: string, message: string = "") {
  console.log(`  ${GREEN}✓${RESET}  ${BOLD}${label}${RESET}${message ? `  — ${message}` : ""}`);
}

function fail(label: string, hint: string) {
  console.log(`  ${RED}✗${RESET}  ${BOLD}${label}${RESET}  — ${RED}MISSING${RESET}`);
  console.log(`       ${YELLOW}↳ ${hint}${RESET}`);
}

function warn(label: string, hint: string) {
  console.log(`  ${YELLOW}⚠${RESET}  ${BOLD}${label}${RESET}  — ${YELLOW}${hint}${RESET}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}${CYAN}         SchedAI — Production Environment Check         ${RESET}`);
console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════${RESET}\n`);

let failures = 0;
let warnings = 0;

// Required variables
console.log(`${BOLD}Required Variables${RESET}`);
console.log(`─────────────────────────────────────────────────────\n`);
for (const { key, hint } of REQUIRED_VARS) {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    fail(key, hint);
    failures++;
  } else {
    // Redact value — show only first 6 chars + masked
    const display = value.length > 6 ? `${value.slice(0, 6)}${"*".repeat(Math.min(value.length - 6, 20))}` : "******";
    pass(key, `Set (${display})`);

    // Validation heuristics
    if (key === "DATABASE_URL" && !value.startsWith("postgresql://") && !value.startsWith("postgres://")) {
      warn(key, "Value does not look like a PostgreSQL URL — please double-check.");
      warnings++;
    }
    if (key === "AUTH_SECRET" && value.length < 32) {
      warn(key, `AUTH_SECRET is only ${value.length} chars — should be ≥32 for security.`);
      warnings++;
    }
  }
}

// Optional variables
console.log(`\n${BOLD}Optional / Runtime Variables${RESET}`);
console.log(`─────────────────────────────────────────────────────\n`);
for (const { key, hint, productionWarning } of OPTIONAL_VARS) {
  const value = process.env[key];
  if (productionWarning) {
    warn(key, hint);
    warnings++;
  } else if (value) {
    pass(key, value === "production" ? `${GREEN}production${RESET}` : value);
  } else {
    console.log(`  ${CYAN}-${RESET}  ${BOLD}${key}${RESET}  — ${CYAN}Not set (optional)${RESET}`);
  }
}

// Summary
console.log(`\n${BOLD}═══════════════════════════════════════════════════════${RESET}`);
if (failures === 0 && warnings === 0) {
  console.log(`${GREEN}${BOLD}  ✓ All checks passed. Environment is production-ready.${RESET}`);
} else if (failures === 0) {
  console.log(`${YELLOW}${BOLD}  ⚠ Passed with ${warnings} warning(s). Review before deploying.${RESET}`);
} else {
  console.log(`${RED}${BOLD}  ✗ ${failures} required variable(s) missing. Fix before deploying.${RESET}`);
}
console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}\n`);

if (failures > 0) {
  process.exit(1);
}
