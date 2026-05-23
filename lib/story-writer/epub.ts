// Minimal EPUB 3 builder using a hand-rolled ZIP encoder so we don't need to
// add a runtime dependency. Stores files uncompressed (deflate raw, level=stored)
// which is valid per the EPUB spec and what most readers accept.

import { deflateRawSync } from "node:zlib";

type ZipEntry = {
  name: string;
  data: Buffer;
  store?: boolean;
};

function crc32(buf: Buffer): number {
  let c: number;
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      c = n;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i += 1) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}
let crcTable: Int32Array | null = null;

function dosTime(): { time: number; date: number } {
  const d = new Date();
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1f);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}

function buildZip(entries: ZipEntry[]): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const { time, date } = dosTime();

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const stored = entry.store === true;
    const compressed = stored ? entry.data : deflateRawSync(entry.data);
    const crc = crc32(entry.data);
    const method = stored ? 0 : 8;
    const compressedSize = compressed.length;
    const uncompressedSize = entry.data.length;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // gp flag
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    local.push(localHeader, nameBuf, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // gp flag
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(date, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra
    centralHeader.writeUInt16LE(0, 32); // comment
    centralHeader.writeUInt16LE(0, 34); // disk
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42);

    central.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(central);
  const localBuf = Buffer.concat(local);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(localBuf.length, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([localBuf, centralBuf, end]);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paragraphify(body: string): string {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeXml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

export type EpubChapter = {
  number: number;
  title: string;
  body: string;
};

export function buildEpub(input: {
  title: string;
  author: string;
  chapters: ReadonlyArray<EpubChapter>;
}): Buffer {
  const id = `mrnine-${Date.now()}`;
  const lang = "vi";
  const safeTitle = escapeXml(input.title);
  const safeAuthor = escapeXml(input.author);

  const manifestItems: string[] = [
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="style" href="style.css" media-type="text/css"/>`,
  ];
  const spineItems: string[] = [];
  const navList: string[] = [];
  const ncxList: string[] = [];

  const chapterFiles: ZipEntry[] = [];

  input.chapters.forEach((ch, idx) => {
    const fileId = `chap${idx + 1}`;
    const fileName = `${fileId}.xhtml`;
    manifestItems.push(`<item id="${fileId}" href="${fileName}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${fileId}"/>`);
    const heading = escapeXml(`Chương ${ch.number}: ${ch.title}`);
    navList.push(`<li><a href="${fileName}">${heading}</a></li>`);
    ncxList.push(
      `<navPoint id="navPoint-${idx + 1}" playOrder="${idx + 1}"><navLabel><text>${heading}</text></navLabel><content src="${fileName}"/></navPoint>`,
    );

    const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}" lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <title>${heading}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${heading}</h1>
  ${paragraphify(ch.body)}
</body>
</html>`;
    chapterFiles.push({ name: `OEBPS/${fileName}`, data: Buffer.from(xhtml, "utf8") });
  });

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${id}</dc:identifier>
    <dc:title>${safeTitle}</dc:title>
    <dc:creator>${safeAuthor}</dc:creator>
    <dc:language>${lang}</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join("\n    ")}
  </manifest>
  <spine toc="ncx">
    <itemref idref="nav"/>
    ${spineItems.join("\n    ")}
  </spine>
</package>`;

  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <title>${safeTitle}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc"><h1>${safeTitle}</h1><ol>${navList.join("")}</ol></nav>
</body>
</html>`;

  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="${lang}">
  <head><meta name="dtb:uid" content="urn:uuid:${id}"/></head>
  <docTitle><text>${safeTitle}</text></docTitle>
  <navMap>
    ${ncxList.join("\n    ")}
  </navMap>
</ncx>`;

  const css = `body{font-family:Georgia,serif;line-height:1.6;margin:2em;color:#1a1a1a;}h1{font-size:1.4em;margin:0 0 1em;}p{text-indent:1.5em;margin:0 0 0.6em;}`;

  const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  const entries: ZipEntry[] = [
    // The mimetype file MUST be the first entry and stored uncompressed.
    { name: "mimetype", data: Buffer.from("application/epub+zip", "utf8"), store: true },
    { name: "META-INF/container.xml", data: Buffer.from(containerXml, "utf8") },
    { name: "OEBPS/content.opf", data: Buffer.from(opf, "utf8") },
    { name: "OEBPS/nav.xhtml", data: Buffer.from(nav, "utf8") },
    { name: "OEBPS/toc.ncx", data: Buffer.from(ncx, "utf8") },
    { name: "OEBPS/style.css", data: Buffer.from(css, "utf8") },
    ...chapterFiles,
  ];

  return buildZip(entries);
}
