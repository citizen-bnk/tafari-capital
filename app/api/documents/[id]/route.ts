import { get } from "@vercel/blob";
import {
  actor,
  isAdmin,
  HttpError,
  errorResponse,
  audit,
  rateLimit,
} from "@/lib/access";
import { db } from "@/lib/db";
import { uuid } from "@/lib/validation";
import { sampleDocument } from "@/lib/demo/document";
import { officePreview, wordType, sheetType } from "@/lib/document-preview";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const a = await actor(),
      id = uuid.parse((await params).id);
    const [d] =
      await db()`SELECT * FROM documents d WHERE id=${id} AND state='ready' AND (owner_id=${a.id} OR ${isAdmin(a)} OR EXISTS(SELECT 1 FROM document_grants g WHERE g.document_id=d.id AND g.user_id=${a.id}))`;
    if (!d)
      throw new HttpError(
        404,
        "File not found or access has not been granted.",
      );
    const mode = new URL(request.url).searchParams.get("mode") || "download";
    const headers = {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Type": d.content_type,
      "Content-Disposition": `${mode === "inline" ? "inline" : "attachment"}; filename="${d.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
    };
    if (mode === "metadata") {
      return Response.json(
        {
          document: {
            id: d.id,
            name: d.name,
            kind: d.kind,
            size: Number(d.size),
            content_type: d.content_type,
            listing_id: d.listing_id,
            can_manage: d.owner_id === a.id || isAdmin(a),
          },
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (!["download", "inline", "preview"].includes(mode))
      throw new HttpError(400, "Unknown document view.");
    if (
      mode === "inline" &&
      d.content_type !== "application/pdf" &&
      !["image/jpeg", "image/png", "image/webp"].includes(d.content_type)
    )
      throw new HttpError(415, "Use the document viewer for this file format.");
    if (mode === "preview" && ![wordType, sheetType].includes(d.content_type))
      throw new HttpError(415, "This document uses a PDF or photo preview.");
    if (a.demo) {
      if (!d.pathname.startsWith("demo-synthetic/"))
        throw new HttpError(404, "Sample file not found.");
      await audit(
        a,
        mode === "download" ? "document_downloaded" : "document_viewed",
        "document",
        id,
        "Synthetic demo evidence",
      );
      return new Response(new Uint8Array(sampleDocument(d.name)), {
        headers,
      });
    }
    const blob = await get(d.pathname, { access: "private" });
    if (!blob || blob.statusCode !== 200)
      throw new HttpError(404, "File not found.");
    if (mode === "preview") {
      await rateLimit("preview:" + a.id, 20);
      const reader = blob.stream.getReader(),
        chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > 20 * 1024 * 1024) {
            await reader.cancel();
            throw new HttpError(
              413,
              "This file exceeds the preview size limit.",
            );
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const bytes = Buffer.concat(chunks);
      const q = new URL(request.url).searchParams,
        sheet = Math.max(
          0,
          Math.min(Math.floor(Number(q.get("sheet"))) || 0, 1000),
        ),
        page = Math.max(
          0,
          Math.min(Math.floor(Number(q.get("page"))) || 0, 100000),
        );
      try {
        const preview = officePreview(bytes, d.content_type, sheet, page);
        await audit(
          a,
          "document_viewed",
          "document",
          id,
          "In-app Office preview",
        );
        return Response.json(
          { preview },
          { headers: { "Cache-Control": "private, no-store" } },
        );
      } catch (e) {
        if (e instanceof HttpError) throw e;
        throw new HttpError(
          422,
          e instanceof Error
            ? e.message.slice(0, 200)
            : "This document could not be previewed. Download the original file.",
        );
      }
    }
    await audit(
      a,
      mode === "inline" ? "document_viewed" : "document_downloaded",
      "document",
      id,
    );
    return new Response(blob.stream, {
      headers,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
