import { SignJWT, jwtVerify } from "jose";

const getSecret = () => {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      // In production, never use a fallback secret — fail fast and loudly.
      throw new Error(
        "AUTH_SECRET environment variable is not set. " +
        "The application cannot operate securely without it. " +
        "Set AUTH_SECRET in your production environment."
      );
    }
    // Development-only fallback with a clear warning
    console.warn(
      "[SchedAI] WARNING: AUTH_SECRET / JWT_SECRET is not set. " +
      "Using an insecure fallback secret for DEVELOPMENT ONLY. " +
      "Never deploy to production without setting AUTH_SECRET."
    );
    return new TextEncoder().encode("schedai_dev_only_fallback_do_not_use_in_production");
  }
  return new TextEncoder().encode(secret);
};

export type JWTPayload = {
  id: string;
  role: "ADMIN" | "FACULTY" | "STUDENT";
};

export async function signToken(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret());

  return token;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as JWTPayload;
  } catch {
    return null;
  }
}

