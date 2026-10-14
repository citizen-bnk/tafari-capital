import { get } from "@vercel/blob";
import { actor, isAdmin, HttpError, errorResponse, audit } from "@/lib/access";
import { db } from "@/lib/db";
import { uuid } from "@/lib/validation";
import { sampleDocument } from "@/lib/demo/document";
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
    if (a.demo) {
      if (!d.pathname.startsWith("demo-synthetic/"))
        throw new HttpError(404, "Sample file not found.");
      await audit(
        a,
        "document_downloaded",
        "document",
        id,
        "Synthetic demo evidence",
      );
      return new Response(new Uint8Array(sampleDocument(d.name)), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${d.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    const blob = await get(d.pathname, { access: "private" });
    if (!blob || blob.statusCode !== 200)
      throw new HttpError(404, "File not found.");
    await audit(a, "document_downloaded", "document", id);
    return new Response(blob.stream, {
      headers: {
        "Content-Type": d.content_type,
        "Content-Disposition": `attachment; filename="${d.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
