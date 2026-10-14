import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { head } from "@vercel/blob";
import {
  actor,
  isAdmin,
  sameOrigin,
  errorResponse,
  HttpError,
  rateLimit,
} from "@/lib/access";
import { db } from "@/lib/db";
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        sameOrigin(request);
        const a = await actor();
        if (a.demo) throw new HttpError(403, "Demo accounts use synthetic evidence. Register to upload your own files.");
        await rateLimit("upload:" + a.id, 15);
        const [d] =
          await db()`SELECT * FROM documents WHERE pathname=${pathname} AND state='pending' AND (owner_id=${a.id} OR ${isAdmin(a)}) AND created_at>now()-interval '1 hour'`;
        if (!d) throw new HttpError(403, "Upload is not authorized.");
        // Use the storage service clock so token expiry survives clock skew
        // between a development workstation and the cloud upload service.
        const clockResponse = await fetch("https://blob.vercel-storage.com", {
          method: "HEAD",
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        const serviceTime = Date.parse(clockResponse.headers.get("date") || "");
        if (!Number.isFinite(serviceTime)) {
          throw new HttpError(503, "File storage is temporarily unavailable.");
        }
        return {
          validUntil: serviceTime + 15 * 60 * 1000,
          allowedContentTypes: [d.content_type],
          maximumSizeInBytes: Number(d.size),
          addRandomSuffix: false,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({ id: d.id, pathname: d.pathname }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) throw new Error("Missing upload metadata");
        const p = JSON.parse(tokenPayload);
        if (blob.pathname !== p.pathname)
          throw new Error("Upload pathname mismatch");
        const metadata = await head(blob.pathname);
        const [expected] =
          await db()`SELECT size,content_type FROM documents WHERE id=${p.id} AND pathname=${blob.pathname} AND state='pending'`;
        if (!expected) return;
        if (
          metadata.size !== Number(expected.size) ||
          metadata.contentType !== expected.content_type
        ) {
          throw new Error("Upload metadata mismatch");
        }
        await db()`UPDATE documents SET state='ready' WHERE id=${p.id} AND pathname=${blob.pathname} AND state='pending'`;
      },
    });
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
