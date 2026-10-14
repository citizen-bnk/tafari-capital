"use client";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from "pdfjs-dist";
import { ErrorBox, Loading } from "@/components/ui";
export default function PdfPreview({
  url,
  name,
}: {
  url: string;
  name: string;
}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null),
    [page, setPage] = useState(1),
    [zoom, setZoom] = useState(1),
    [width, setWidth] = useState(800),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [pageText, setPageText] = useState(""),
    [passwordRequired, setPasswordRequired] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null),
    container = useRef<HTMLDivElement>(null),
    passwordCallback = useRef<((password: string) => void) | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(200, entries[0].contentRect.width - 32)),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let current = true,
      task: PDFDocumentLoadingTask | undefined;
    setLoading(true);
    setError("");
    setPdf(null);
    setPage(1);
    setPageText("");
    async function load() {
      try {
        const library = await import("pdfjs-dist");
        if (!current) return;
        library.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        task = library.getDocument({
          url,
          withCredentials: true,
          disableRange: true,
          disableStream: true,
          cMapUrl: "/pdfjs/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "/pdfjs/standard_fonts/",
          wasmUrl: "/pdfjs/wasm/",
        });
        task.onPassword = (callback: (password: string) => void) => {
          if (current) {
            passwordCallback.current = callback;
            setPasswordRequired(true);
            setLoading(false);
          }
        };
        const document = await task.promise;
        if (current) {
          setPdf(document);
          setPasswordRequired(false);
        }
      } catch {
        if (current) {
          setError(
            "This PDF could not be opened. You can download the original or request a readable copy.",
          );
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      current = false;
      passwordCallback.current = null;
      if (task) void task.destroy();
    };
  }, [url]);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let current = true,
      cancel: (() => void) | undefined;
    setLoading(true);
    setError("");
    async function render() {
      try {
        const p = await pdf!.getPage(page);
        if (!current || !canvas.current) return;
        const base = p.getViewport({ scale: 1 }),
          fit = Math.min(1.5, width / base.width),
          viewport = p.getViewport({ scale: fit * zoom });
        const ratio = Math.min(window.devicePixelRatio || 1, 2),
          element = canvas.current;
        element.width = Math.ceil(viewport.width * ratio);
        element.height = Math.ceil(viewport.height * ratio);
        element.style.width = `${viewport.width}px`;
        element.style.height = `${viewport.height}px`;
        const task = p.render({
          canvas: element,
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        cancel = () => task.cancel();
        await task.promise;
        const text = await p.getTextContent();
        if (current) {
          setPageText(
            text.items.map((item) => ("str" in item ? item.str : "")).join(" "),
          );
          setLoading(false);
        }
      } catch (e) {
        if (
          current &&
          !(e instanceof Error && e.name === "RenderingCancelledException")
        ) {
          setError("This page could not be rendered.");
          setLoading(false);
        }
      }
    }
    void render();
    return () => {
      current = false;
      cancel?.();
    };
  }, [pdf, page, width, zoom]);
  return (
    <div ref={container} className="pdf-preview">
      <div className="pdf-controls">
        <button
          className="btn outline small"
          disabled={!pdf || page <= 1 || loading}
          onClick={() => setPage(page - 1)}
        >
          ← Previous page
        </button>
        <span>
          Page {page} of {pdf?.numPages || "…"}
        </span>
        <button
          className="btn outline small"
          disabled={!pdf || page >= pdf.numPages || loading}
          onClick={() => setPage(page + 1)}
        >
          Next page →
        </button>
        <button
          className="btn outline small"
          aria-label="Zoom out"
          disabled={zoom <= 0.5 || loading}
          onClick={() => setZoom((z) => z - 0.25)}
        >
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          className="btn outline small"
          aria-label="Zoom in"
          disabled={zoom >= 2 || loading}
          onClick={() => setZoom((z) => z + 0.25)}
        >
          +
        </button>
      </div>
      {passwordRequired && (
        <form
          className="panel inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            passwordCallback.current?.(
              String(new FormData(e.currentTarget).get("password") || ""),
            );
            setPasswordRequired(false);
            setLoading(true);
          }}
        >
          <label>
            PDF password
            <input
              name="password"
              type="password"
              required
              autoComplete="off"
            />
          </label>
          <button className="btn dark">Open PDF</button>
        </form>
      )}
      <ErrorBox message={error} />
      {loading && <Loading />}
      <div className="pdf-canvas-wrap">
        <canvas
          ref={canvas}
          aria-label={`${name}, page ${page}`}
          data-rendered={!!pdf && !loading && !error ? "true" : "false"}
        />
      </div>
      {pageText && (
        <details className="pdf-page-text">
          <summary>Read text on this page</summary>
          <p>{pageText}</p>
        </details>
      )}
    </div>
  );
}
