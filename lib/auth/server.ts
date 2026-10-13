import { createNeonAuth } from "@neondatabase/auth/next/server";
let instance: ReturnType<typeof createNeonAuth> | undefined;
export function getAuth() {
  if (!instance)
    instance = createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL!,
      cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET!,
        sessionDataTtl: 1,
      },
    });
  return instance;
}
