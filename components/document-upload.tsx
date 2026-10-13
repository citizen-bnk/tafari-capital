"use client";
import { upload } from "@vercel/blob/client";
import { useState } from "react";
import { api } from "@/lib/client";
import { ErrorBox } from "@/components/ui";
export function DocumentUpload({
  listingId,
  onUploaded,
}: {
  listingId: string;
  onUploaded: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0);
  return (
    <form
      className="file-upload"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget,
          f = new FormData(form),
          file = f.get("file") as File;
        setBusy(true);
        setError("");
        setProgress(0);
        try {
          if (!file || !file.size) throw new Error("Choose a file.");
          if (file.size > 20 * 1024 * 1024)
            throw new Error("Files must be 20 MB or smaller.");
          const r = await api<{ id: string; pathname: string }>(
            "documents/init",
            {
              listing_id: listingId,
              name: file.name,
              kind: f.get("kind"),
              size: file.size,
              content_type: file.type,
            },
          );
          await upload(r.pathname, file, {
            access: "private",
            handleUploadUrl: "/api/upload",
            contentType: file.type,
            onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
          });
          await api("documents/" + r.id, { action: "complete" });
          form.reset();
          onUploaded();
        } catch (x) {
          setError((x as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Document category
        <select name="kind">
          <option value="title">Title / mining right evidence</option>
          <option value="mandate">Signed owner mandate</option>
          <option value="technical">Technical report / assay</option>
          <option value="company">Company documents</option>
          <option value="photo">Asset photo</option>
          <option value="other">Other evidence</option>
        </select>
      </label>
      <label>
        Choose file
        <input
          name="file"
          type="file"
          required
          accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx"
        />
      </label>
      <div className="full">
        <small className="muted">
          Private storage · PDF, JPG, PNG, WEBP, DOCX, XLSX · Maximum 20 MB per
          file
        </small>
        <ErrorBox message={error} />
      </div>
      <div className="full actions">
        <button className="btn dark" disabled={busy}>
          {busy ? `Uploading ${progress}%…` : "Upload document ↑"}
        </button>
        {busy && (
          <span className="muted">
            Keep this page open until the upload completes.
          </span>
        )}
      </div>
    </form>
  );
}
