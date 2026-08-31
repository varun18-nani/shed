import { SignJWT, jwtVerify } from "jose";

const getSecret = () => {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    console.warn("AUTH_SECRET or JWT_SECRET is not set in environment variables. Using a fallback secret (NOT FOR PRODUCTION).");
    return new TextEncoder().encode("fallback_development_secret_only");
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
  } catch (error) {
    return null;
  }
}
