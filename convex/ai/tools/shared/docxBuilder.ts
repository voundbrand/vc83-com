const DOCX_XMLNS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const DOCX_XMLNS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

export interface DocxSection {
  heading?: string;
  paragraphs: string[];
}

export interface DocxBuildInput {
  title?: string;
  subtitle?: string;
  sections: DocxSection[];
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeText(value: unknown, maxLength = 4000): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, maxLength);
}

function buildParagraph(text: string, style?: "Title" | "Subtitle" | "Heading1"): string {
  const styleXml = style
    ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>`
    : "";
  return `<w:p>${styleXml}<w:r><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

function buildDocumentXml(input: DocxBuildInput): string {
  const body: string[] = [];
  const title = normalizeText(input.title, 240);
  const subtitle = normalizeText(input.subtitle, 360);

  if (title) {
    body.push(buildParagraph(title, "Title"));
  }
  if (subtitle) {
    body.push(buildParagraph(subtitle, "Subtitle"));
  }

  for (const section of input.sections) {
    const heading = normalizeText(section.heading, 240);
    if (heading) {
      body.push(buildParagraph(heading, "Heading1"));
    }
    for (const paragraph of section.paragraphs) {
      const normalized = normalizeText(paragraph, 6000);
      if (normalized) {
        body.push(buildParagraph(normalized));
      }
    }
  }

  if (body.length === 0) {
    body.push(buildParagraph("Empty document"));
  }

  body.push("<w:sectPr/>");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${DOCX_XMLNS_W}" xmlns:r="${DOCX_XMLNS_R}">
  <w:body>
    ${body.join("\n    ")}
  </w:body>
</w:document>`;
}

function toDosDateTime(): { time: number; date: number } {
  return { time: 0, date: 0 };
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    const idx = (crc ^ bytes[i]) & 0xff;
    crc = CRC32_TABLE[idx] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatArrays(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

function buildZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const { time, date } = toDosDateTime();

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, time, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, entry.data.length, true);
    localView.setUint32(22, entry.data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, entry.data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, time, true);
    centralView.setUint16(14, date, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, entry.data.length, true);
    centralView.setUint32(24, entry.data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + entry.data.length;
  }

  const centralDirectory = concatArrays(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralDirectory.length, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  return concatArrays([...localParts, centralDirectory, end]);
}

function utf8(content: string): Uint8Array {
  return new TextEncoder().encode(content);
}

export function buildDocxBytes(input: DocxBuildInput): Uint8Array {
  const createdIso = "2000-01-01T00:00:00Z";
  const documentXml = buildDocumentXml(input);
  const entries: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="${DOCX_MIME}.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="${DOCX_MIME}.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`),
    },
    {
      name: "_rels/.rels",
      data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`),
    },
    {
      name: "docProps/core.xml",
      data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xmlEscape(normalizeText(input.title, 240) || "Untitled Document")}</dc:title>
  <dc:creator>vc83-agentic-system</dc:creator>
  <cp:lastModifiedBy>vc83-agentic-system</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${createdIso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${createdIso}</dcterms:modified>
</cp:coreProperties>`),
    },
    {
      name: "docProps/app.xml",
      data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>vc83-agentic-system</Application>
</Properties>`),
    },
    {
      name: "word/_rels/document.xml.rels",
      data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`),
    },
    {
      name: "word/styles.xml",
      data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${DOCX_XMLNS_W}">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:rPr><w:b/><w:sz w:val="48"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:rPr><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
</w:styles>`),
    },
    {
      name: "word/document.xml",
      data: utf8(documentXml),
    },
  ];

  return buildZip(entries);
}
