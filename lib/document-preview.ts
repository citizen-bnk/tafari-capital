import { unzipSync, strFromU8 } from "fflate";
import { XMLParser } from "fast-xml-parser";
export const wordType =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const sheetType =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export type OfficePreview =
  | { kind: "word"; paragraphs: string[]; truncated: boolean }
  | {
      kind: "spreadsheet";
      sheets: string[];
      sheetIndex: number;
      rows: { number: number; cells: string[] }[];
      rowTotal: number;
      page: number;
      columns: number;
      truncated: boolean;
    };
type Node = Record<string, unknown>;
function object(value: unknown): Node {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Node)
    : {};
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}
function text(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return value.map(text).join("");
  const n = object(value);
  if ("#text" in n) return text(n["#text"]);
  return Object.entries(n)
    .filter(([key]) => !key.startsWith("@") && key !== ":@")
    .map(([key, v]) => (key === "br" ? "\n" : key === "tab" ? "\t" : text(v)))
    .join("");
}
function xml(data: Uint8Array | undefined, ordered = false): unknown {
  if (!data) throw new Error("Required document content is missing.");
  const source = strFromU8(data);
  if (/<!DOCTYPE|<!ENTITY/i.test(source))
    throw new Error(
      "Documents with XML entity declarations cannot be previewed.",
    );
  return new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    preserveOrder: ordered,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
    processEntities: true,
  }).parse(source);
}
export function officePreview(
  bytes: Uint8Array,
  type: string,
  sheetIndex = 0,
  page = 0,
): OfficePreview {
  let total = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      const needed =
        type === wordType
          ? file.name === "word/document.xml"
          : [
              "xl/workbook.xml",
              "xl/_rels/workbook.xml.rels",
              "xl/sharedStrings.xml",
            ].includes(file.name) ||
            /^xl\/worksheets\/sheet[0-9]+\.xml$/.test(file.name);
      if (!needed) return false;
      total += file.originalSize;
      if (file.originalSize > 5 * 1024 * 1024 || total > 20 * 1024 * 1024)
        throw new Error(
          "This document is too large for an in-app content preview. Download the original file.",
        );
      return true;
    },
  });
  if (type === wordType) {
    const paragraphs: string[] = [];
    let characters = 0,
      truncated = false;
    function walk(value: unknown) {
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      for (const [key, child] of Object.entries(object(value))) {
        if (key === ":@") continue;
        if (key === "p") {
          const line = text(child);
          if (characters + line.length <= 500000 && paragraphs.length < 5000) {
            paragraphs.push(line);
            characters += line.length;
          } else truncated = true;
        } else walk(child);
      }
    }
    walk(xml(files["word/document.xml"], true));
    return { kind: "word", paragraphs, truncated };
  }
  if (type !== sheetType)
    throw new Error("This file format cannot be previewed.");
  const workbook = object(object(xml(files["xl/workbook.xml"])).workbook);
  const sheets = array(object(workbook.sheets).sheet).map(object);
  if (!sheets.length) throw new Error("This workbook has no sheets.");
  const index = Math.max(0, Math.min(sheetIndex, sheets.length - 1));
  const relations = array(
    object(object(xml(files["xl/_rels/workbook.xml.rels"])).Relationships)
      .Relationship,
  ).map(object);
  const relationship = relations.find(
    (r) => r["@_Id"] === sheets[index]["@_id"],
  );
  const target = String(relationship?.["@_Target"] || "");
  const pathname = target.startsWith("/xl/")
    ? target.slice(1)
    : "xl/" + target.replace(/^\.\//, "");
  if (!/^xl\/worksheets\/sheet[0-9]+\.xml$/.test(pathname))
    throw new Error("This worksheet cannot be previewed.");
  const shared = files["xl/sharedStrings.xml"]
    ? array(object(object(xml(files["xl/sharedStrings.xml"])).sst).si).map(text)
    : [];
  const rows = array(
    object(object(object(xml(files[pathname])).worksheet).sheetData).row,
  ).map(object);
  const current = Math.max(
    0,
    Math.min(page, Math.max(0, Math.ceil(rows.length / 100) - 1)),
  );
  let columns = 1,
    truncated = false;
  const previewRows = rows
    .slice(current * 100, current * 100 + 100)
    .map((row, i) => {
      const cells: string[] = [];
      for (const c of array(row.c).map(object)) {
        const reference = String(c["@_r"] || ""),
          letters = reference.match(/^[A-Z]+/)?.[0] || "";
        const column = letters
          ? [...letters].reduce(
              (n, letter) => n * 26 + letter.charCodeAt(0) - 64,
              0,
            ) - 1
          : cells.length;
        if (column < 0 || column >= 50) {
          truncated = true;
          continue;
        }
        const value =
          c["@_t"] === "s"
            ? shared[Number(text(c.v))] || ""
            : c["@_t"] === "inlineStr"
              ? text(c.is)
              : c["@_t"] === "b"
                ? text(c.v) === "1"
                  ? "TRUE"
                  : "FALSE"
                : text(c.v);
        if (value.length > 20000) truncated = true;
        cells[column] = value.slice(0, 20000);
        columns = Math.max(columns, column + 1);
      }
      return { number: Number(row["@_r"]) || current * 100 + i + 1, cells };
    });
  return {
    kind: "spreadsheet",
    sheets: sheets.map((s, i) => String(s["@_name"] || `Sheet ${i + 1}`)),
    sheetIndex: index,
    rows: previewRows,
    rowTotal: rows.length,
    page: current,
    columns,
    truncated,
  };
}
