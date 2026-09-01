/**
 * SchedAI — Structured Logger & Observability Utility
 *
 * Provides safe, structured server logging without leaking secrets, tokens,
 * passwords, or database credentials.
 */

type LogLevel = "info" | "warn" | "error";

interface LogMeta {
  route?: string;
  method?: string;
  requestId?: string;
  userId?: string;
  event?: string;
  [key: string]: any;
}

// Keys that must NEVER be logged in any metadata
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "auth_secret",
  "jwt_secret",
  "database_url",
  "secret",
  "authorization",
  "cookie",
  "session",
]);

function sanitizeMeta(meta: LogMeta): LogMeta {
  const clean: LogMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitizeMeta(value as LogMeta);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function formatLog(level: LogLevel, message: string, meta?: LogMeta): string {
  const timestamp = new Date().toISOString();
  const sanitized = meta ? sanitizeMeta(meta) : {};
  const reqPart = sanitized.requestId ? ` [Req: ${sanitized.requestId}]` : "";
  const routePart = sanitized.route ? ` [${sanitized.method || "GET"} ${sanitized.route}]` : "";
  
  if (Object.keys(sanitized).length > 0) {
    return `[${timestamp}] [${level.toUpperCase()}]${reqPart}${routePart} ${message} ${JSON.stringify(sanitized)}`;
  }
  return `[${timestamp}] [${level.toUpperCase()}]${reqPart}${routePart} ${message}`;
}

export const logger = {
  info(message: string, meta?: LogMeta) {
    console.log(formatLog("info", message, meta));
  },
  warn(message: string, meta?: LogMeta) {
    console.warn(formatLog("warn", message, meta));
  },
  error(message: string, meta?: LogMeta) {
    console.error(formatLog("error", message, meta));
  },
};

/**
 * Generate a unique random Request ID (e.g. for X-Request-ID headers)
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}
