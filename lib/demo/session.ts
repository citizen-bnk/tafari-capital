import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { demoAccounts } from "./accounts";

export const demoCookie = "tafari_demo_session";
export const demoSessionSeconds = 2 * 60 * 60;
type DemoSession = {
  purpose: "tafari-demo-v1";
  id: string;
  exp: number;
  nonce: string;
};
function signature(payload: string) {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!secret) throw new Error("Session signing is not configured");
  return createHmac("sha256", secret)
    .update("tafari-demo-v1:" + payload)
    .digest();
}
export function issueDemoSession(id: string) {
  if (!demoAccounts.some((a) => a.id === id))
    throw new Error("Unknown demo account");
  const value: DemoSession = {
    purpose: "tafari-demo-v1",
    id,
    exp: Math.floor(Date.now() / 1000) + demoSessionSeconds,
    nonce: randomUUID(),
  };
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return payload + "." + signature(payload).toString("base64url");
}
export class InvalidDemoSession extends Error {}
export async function readDemoSession(): Promise<DemoSession | null> {
  const token = (await cookies()).get(demoCookie)?.value;
  if (!token) return null;
  try {
    if (token.length > 1024) throw new Error();
    const [payload, encodedSignature, extra] = token.split(".");
    if (!payload || !encodedSignature || extra) throw new Error();
    const received = Buffer.from(encodedSignature, "base64url"),
      expected = signature(payload);
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    )
      throw new Error();
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as DemoSession;
    if (
      session.purpose !== "tafari-demo-v1" ||
      !Number.isInteger(session.exp) ||
      session.exp <= Math.floor(Date.now() / 1000) ||
      !demoAccounts.some((a) => a.id === session.id)
    )
      throw new Error();
    return session;
  } catch {
    // Never fall back to a real session when a demo cookie is invalid or expired.
    throw new InvalidDemoSession(
      "Your demo session expired. Select a demo account again or leave the demo.",
    );
  }
}
