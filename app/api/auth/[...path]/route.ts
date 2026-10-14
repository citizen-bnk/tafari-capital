import { getAuth } from "@/lib/auth/server";
import type { NextRequest } from "next/server";
import { demoCookie } from "@/lib/demo/session";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
export function GET(request: NextRequest, context: Context) {
  return getAuth().handler().GET(request, context);
}
export async function POST(request: NextRequest, context: Context) {
  const response = await getAuth().handler().POST(request, context);
  const { path } = await context.params;
  if (response.ok && ["sign-in", "sign-up", "sign-out"].includes(path[0])) {
    response.headers.append(
      "Set-Cookie",
      `${demoCookie}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${request.nextUrl.protocol === "https:" ? "; Secure" : ""}`,
    );
  }
  return response;
}
