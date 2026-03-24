import {
  PDFDocument,
  PDFName,
  PDFRef,
  PDFRawStream,
  PDFArray,
  PDFDict,
  PDFNumber,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { inflateSync } from 'zlib';

interface PlaceholderLocation {
  key: string;
  x: number;
  y: number;
  fontSize: number;
}

/**
 * Decompress a FlateDecode stream. Returns original bytes if not compressed.
 */
function tryDecompress(data: Uint8Array, dict: PDFDict): Uint8Array {
  const filter = dict.get(PDFName.of('Filter'));
  if (filter && filter.toString() === '/FlateDecode') {
    return new Uint8Array(inflateSync(data));
  }
  return data;
}

/**
 * Get the full decompressed content stream string for a page.
 */
function getPageContentStream(
  doc: PDFDocument,
  pageNode: ReturnType<PDFDocument['getPages']>[0]['node'],
): string {
  const contentsEntry = pageNode.get(PDFName.of('Contents'));
  if (!contentsEntry) return '';

  const refs: PDFRef[] = [];
  if (contentsEntry instanceof PDFRef) {
    refs.push(contentsEntry);
  } else if (contentsEntry instanceof PDFArray) {
    for (let i = 0; i < contentsEntry.size(); i++) {
      const el = contentsEntry.get(i);
      if (el instanceof PDFRef) refs.push(el);
    }
  }

  const parts: string[] = [];
  for (const ref of refs) {
    const obj = doc.context.lookup(ref);
    if (obj instanceof PDFRawStream) {
      const bytes = tryDecompress(obj.contents, obj.dict);
      parts.push(new TextDecoder('latin1').decode(bytes));
    }
  }
  return parts.join('\n');
}

/**
 * Extract plain text from a PDF TJ array string.
 * Example: "[(H)5(e)-3(llo)]" → "Hello"
 */
function extractTextFromTJ(tjContent: string): string {
  let result = '';
  const stringParts = tjContent.match(/\(([^)]*)\)/g);
  if (stringParts) {
    for (const part of stringParts) {
      result += part.slice(1, -1);
    }
  }
  return result;
}

/**
 * Parse a content stream and find all [[placeholder]] patterns,
 * even when split across multiple BT/ET text blocks.
 *
 * The PDF template stores placeholders as invisible (white) text
 * split across separate text operations with kerning values.
 * This function reassembles them by scanning BT/ET blocks in order.
 */
function findPlaceholderLocations(contentStream: string): PlaceholderLocation[] {
  const locations: PlaceholderLocation[] = [];

  // Match BT...ET blocks (permissive whitespace)
  const blockRegex = /BT\s([\s\S]*?)\sET/g;

  interface TextBlock {
    text: string;
    x: number;
    y: number;
    fontSize: number;
  }

  const blocks: TextBlock[] = [];
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(contentStream)) !== null) {
    const body = match[1];

    // Position from Tm matrix: "a b c d x y Tm"
    const tmMatch = body.match(
      /[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s+Tm/,
    );
    const x = tmMatch ? parseFloat(tmMatch[1]) : 0;
    const y = tmMatch ? parseFloat(tmMatch[2]) : 0;

    // Font size from Tf: "/<name> <size> Tf"
    const tfMatch = body.match(/\/\w+\s+([\d.]+)\s+Tf/);
    const fontSize = tfMatch ? parseFloat(tfMatch[1]) : 11;

    // Extract text from TJ array operations
    let text = '';
    const tjArrayMatches = [...body.matchAll(/\[([\s\S]*?)\]\s*TJ/g)];
    for (const tj of tjArrayMatches) {
      text += extractTextFromTJ(tj[1]);
    }
    // Extract text from simple Tj operations
    const tjSimpleMatches = [...body.matchAll(/\(([^)]*)\)\s*Tj/g)];
    for (const tj of tjSimpleMatches) {
      text += tj[1];
    }

    if (text) {
      blocks.push({ text, x, y, fontSize });
    }
  }

  // Concatenate all block text and find [[key]] patterns using regex.
  // This handles cases where [[ is split across blocks (e.g. "[" in one
  // block and "[rental_start_datetime]]" in the next).
  let allText = '';
  const blockOffsets: { textStart: number; block: TextBlock }[] = [];

  for (const block of blocks) {
    blockOffsets.push({ textStart: allText.length, block });
    allText += block.text;
  }

  const placeholderRegex = /\[\[(\w+)\]\]/g;
  let regexMatch: RegExpExecArray | null;

  while ((regexMatch = placeholderRegex.exec(allText)) !== null) {
    const key = regexMatch[1];
    const matchStart = regexMatch.index;

    // Find the block that contains the start of this match
    let ownerBlock: TextBlock | null = null;
    for (let i = blockOffsets.length - 1; i >= 0; i--) {
      if (blockOffsets[i].textStart <= matchStart) {
        ownerBlock = blockOffsets[i].block;
        break;
      }
    }

    if (ownerBlock) {
      locations.push({
        key,
        x: ownerBlock.x,
        y: ownerBlock.y,
        fontSize: ownerBlock.fontSize,
      });
    }
  }

  return locations;
}

/**
 * Strip decorative dash runs (e.g. "--------------------") from a content
 * stream by replacing them with empty strings. These are visual placeholders
 * baked into the PDF template.
 */
function stripDashText(content: string): string {
  return content.replace(/\(-{3,}\)/g, '()');
}

/**
 * Rewrite a page's content stream(s) with the dash text removed.
 */
function stripDashesFromPage(
  doc: PDFDocument,
  pageNode: ReturnType<PDFDocument['getPages']>[0]['node'],
): void {
  const contentsEntry = pageNode.get(PDFName.of('Contents'));
  if (!contentsEntry) return;

  const refs: PDFRef[] = [];
  if (contentsEntry instanceof PDFRef) {
    refs.push(contentsEntry);
  } else if (contentsEntry instanceof PDFArray) {
    for (let i = 0; i < contentsEntry.size(); i++) {
      const el = contentsEntry.get(i);
      if (el instanceof PDFRef) refs.push(el);
    }
  }

  for (const ref of refs) {
    const obj = doc.context.lookup(ref);
    if (!(obj instanceof PDFRawStream)) continue;

    const bytes = tryDecompress(obj.contents, obj.dict);
    const text = new TextDecoder('latin1').decode(bytes);

    if (!text.includes('---')) continue;

    const cleaned = stripDashText(text);
    const encoded = new TextEncoder().encode(cleaned);

    // Write back as uncompressed stream
    const newDict = PDFDict.withContext(doc.context);
    for (const [key, val] of obj.dict.entries()) {
      const k = key.toString();
      if (k !== '/Filter' && k !== '/DecodeParms' && k !== '/Length') {
        newDict.set(key, val);
      }
    }
    newDict.set(PDFName.of('Length'), PDFNumber.of(encoded.length));
    doc.context.assign(ref, PDFRawStream.of(newDict, encoded));
  }
}

/**
 * Fill [[placeholder]] fields in a PDF template with the given values.
 *
 * Parses content streams to find placeholder positions (even when split
 * across multiple text operations), then draws replacement text at those
 * positions using pdf-lib's drawText API. Also strips decorative dash
 * runs from the template.
 *
 * @param templatePath - Path to the template PDF, relative to process.cwd()
 * @param values - Record mapping placeholder keys to their replacement values
 * @returns The filled PDF as a Uint8Array
 */
export async function fillPdfTemplate(
  templatePath: string,
  values: Record<string, string>,
): Promise<Uint8Array> {
  const absolutePath = join(process.cwd(), templatePath);
  const templateBytes = await readFile(absolutePath);
  const doc = await PDFDocument.load(templateBytes);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  for (const page of pages) {
    // Read content stream for placeholder positions before any modifications
    const stream = getPageContentStream(doc, page.node);
    const placeholders = findPlaceholderLocations(stream);

    // Strip decorative dash text BEFORE drawText (which appends new streams)
    stripDashesFromPage(doc, page.node);

    for (const ph of placeholders) {
      const value = values[ph.key];
      if (value !== undefined && value !== '') {
        page.drawText(value, {
          x: ph.x,
          y: ph.y,
          size: ph.fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }
  }

  return doc.save();
}
