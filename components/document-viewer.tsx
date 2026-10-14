"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ErrorBox, Loading, PageIntro } from "@/components/ui";
import type { OfficePreview } from "@/lib/document-preview";
import { label } from "@/lib/types";
const PdfPreview = dynamic(() => import("@/components/pdf-preview"), {
  ssr: false,
  loading: () => <Loading />,
});
type Metadata = {
  id: string;
  name: string;
  kind: string;
  content_type: string;
  size: number;
  listing_id: string;
  can_manage: boolean;
};
export function DocumentViewer({ id }: { id: string }) {
  const [document, setDocument] = useState<Metadata | null>(null),
    [preview, setPreview] = useState<OfficePreview | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [sheet, setSheet] = useState(0),
    [page, setPage] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setDocument(null);
    setPreview(null);
    async function load() {
      try {
        const response = await fetch(`/api/documents/${id}?mode=metadata`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const metadata = await response.json();
        if (!response.ok)
          throw new Error(metadata.error || "File unavailable.");
        if (controller.signal.aborted) return;
        setDocument(metadata.document);
        if (
          metadata.document.content_type !== "application/pdf" &&
          !metadata.document.content_type.startsWith("image/")
        ) {
          const r = await fetch(
            `/api/documents/${id}?mode=preview&sheet=${sheet}&page=${page}`,
            { cache: "no-store", signal: controller.signal },
          );
          const result = await r.json();
          if (!r.ok) throw new Error(result.error || "Preview unavailable.");
          if (!controller.signal.aborted) setPreview(result.preview);
        }
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [id, sheet, page]);
  return (
    <>
      <PageIntro
        eyebrow="Private document viewer"
        title={document?.name || "View document"}
        action={
          document && (
            <a className="btn dark" href={`/api/documents/${id}`}>
              Download original ↓
            </a>
          )
        }
      >
        {document
          ? `${label(document.kind)} · ${(Number(document.size) / 1024 / 1024).toFixed(2)} MB`
          : "Photos and evidence remain within your authorized workspace."}
      </PageIntro>
      {document && (
        <Link
          className="text-link"
          href={
            document.can_manage
              ? `/dashboard/listings/${document.listing_id}`
              : "/dashboard/offers"
          }
        >
          {document.can_manage ? "← Asset documents" : "← Your deals"}
        </Link>
      )}
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : (
        document &&
        !error && (
          <div className="document-viewer">
            {document.content_type === "application/pdf" ? (
              <PdfPreview
                name={document.name}
                url={`/api/documents/${id}?mode=inline`}
              />
            ) : document.content_type.startsWith("image/") ? (
              <div className="image-viewer">
                <img
                  src={`/api/documents/${id}?mode=inline`}
                  alt={document.name}
                  onError={() =>
                    setError(
                      "This photo could not be displayed. You can still download the original.",
                    )
                  }
                />
              </div>
            ) : preview?.kind === "word" ? (
              <article className="word-preview">
                <p className="muted">
                  Text preview · Download the original to retain its layout,
                  embedded media and formatting.
                </p>
                {preview.paragraphs.map((p, i) => (
                  <p key={i}>{p || "\u00a0"}</p>
                ))}
                {preview.truncated && (
                  <div className="notice">
                    This large document exceeds the text preview limit. Download
                    the original for the complete document.
                  </div>
                )}
              </article>
            ) : preview?.kind === "spreadsheet" ? (
              <>
                <div className="sheet-controls">
                  <label>
                    Worksheet
                    <select
                      aria-label="Worksheet"
                      value={preview.sheetIndex}
                      onChange={(e) => {
                        setSheet(Number(e.target.value));
                        setPage(0);
                      }}
                    >
                      {preview.sheets.map((s, i) => (
                        <option key={i} value={i}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="muted">
                    Cell values · {preview.rowTotal} populated rows
                  </p>
                </div>
                <div className="table-wrap sheet-preview">
                  <table>
                    <thead>
                      <tr>
                        <th>Row</th>
                        {Array.from({ length: preview.columns }, (_, i) => (
                          <th key={i}>
                            {i < 26
                              ? String.fromCharCode(65 + i)
                              : "A" + String.fromCharCode(65 + i - 26)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((r, i) => (
                        <tr key={i}>
                          <th>{r.number}</th>
                          {Array.from(
                            { length: preview.columns },
                            (_, column) => (
                              <td key={column}>{r.cells[column] || ""}</td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="actions">
                  <button
                    className="btn outline small"
                    disabled={preview.page === 0}
                    onClick={() => setPage(preview.page - 1)}
                  >
                    ← Previous rows
                  </button>
                  <span className="muted">Page {preview.page + 1}</span>
                  <button
                    className="btn outline small"
                    disabled={(preview.page + 1) * 100 >= preview.rowTotal}
                    onClick={() => setPage(preview.page + 1)}
                  >
                    Next rows →
                  </button>
                </div>
                {preview.truncated && (
                  <div className="notice">
                    The preview shows up to 50 columns and limits very long cell
                    values. Download the original for the complete sheet.
                  </div>
                )}
              </>
            ) : null}
          </div>
        )
      )}
    </>
  );
}
