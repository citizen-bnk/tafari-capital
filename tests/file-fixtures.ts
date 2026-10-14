import { zipSync, strToU8 } from "fflate";
export const docxFixture = Buffer.from(
  zipSync({
    "[Content_Types].xml": strToU8(
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ),
    "word/document.xml": strToU8(
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Private asset brief &amp; terms</w:t></w:r></w:p><w:p><w:r><w:t>Evidence remains in Tafari.</w:t></w:r></w:p></w:body></w:document>',
    ),
  }),
);
export const xlsxFixture = Buffer.from(
  zipSync({
    "[Content_Types].xml": strToU8(
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    ),
    "xl/workbook.xml": strToU8(
      '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Valuation" sheetId="1" r:id="rId1"/><sheet name="Assays" sheetId="2" r:id="rId2"/></sheets></workbook>',
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
    ),
    "xl/sharedStrings.xml": strToU8(
      "<sst><si><t>Asset value</t></si><si><t>Gold assay</t></si></sst>",
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      "<worksheet><sheetData>" +
        Array.from(
          { length: 101 },
          (_, i) =>
            `<row r="${i + 1}"><c r="A${i + 1}" t="s"><v>0</v></c><c r="B${i + 1}"><v>${1000 + i}</v></c></row>`,
        ).join("") +
        "</sheetData></worksheet>",
    ),
    "xl/worksheets/sheet2.xml": strToU8(
      '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>1</v></c><c r="B1"><v>3.75</v></c></row></sheetData></worksheet>',
    ),
  }),
);
export const pngFixture = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2z0AAAAASUVORK5CYII=",
  "base64",
);
