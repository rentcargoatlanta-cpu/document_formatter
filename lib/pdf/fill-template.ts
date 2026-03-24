import {
  PDFDocument,
  PDFName,
  PDFRef,
  PDFRawStream,
  PDFArray,
  PDFDict,
  PDFNumber,
} from 'pdf-lib';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { inflateSync } from 'zlib';

/**
 * Escape special characters for use inside PDF text strings.
 * PDF text strings use () delimiters, so backslash, open-paren,
 * and close-paren must be escaped.
 */
export function escapePdfString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Replace all [[placeholder]] patterns in a content stream string
 * with the corresponding escaped values.
 */
function replaceStreamPlaceholders(
  content: string,
  values: Record<string, string>,
): string {
  return content.replace(/\[\[(\w+)\]\]/g, (_match, key: string) => {
    const value = values[key];
    if (value === undefined) {
      return `[[${key}]]`;
    }
    return escapePdfString(value);
  });
}

/**
 * Try to decompress FlateDecode-compressed data.
 * Returns the decompressed bytes, or the original bytes if not compressed.
 */
function decompressStream(
  data: Uint8Array,
  dict: PDFDict,
): { decompressed: Uint8Array; wasCompressed: boolean } {
  const filter = dict.get(PDFName.of('Filter'));
  if (filter && filter.toString() === '/FlateDecode') {
    const decompressed = inflateSync(data);
    return { decompressed: new Uint8Array(decompressed), wasCompressed: true };
  }
  return { decompressed: data, wasCompressed: false };
}

/**
 * Process a single content stream reference: decompress if needed,
 * replace [[placeholder]] patterns, and write back as uncompressed.
 */
function processContentStreamRef(
  doc: PDFDocument,
  ref: PDFRef,
  values: Record<string, string>,
): void {
  const streamObj = doc.context.lookup(ref);

  if (!(streamObj instanceof PDFRawStream)) {
    return;
  }

  const rawStream = streamObj as PDFRawStream;
  const streamData = rawStream.contents;
  const streamDict = rawStream.dict;

  const { decompressed } = decompressStream(streamData, streamDict);

  const contentString = new TextDecoder('latin1').decode(decompressed);

  // Only process if the stream contains placeholder patterns
  if (!contentString.includes('[[')) {
    return;
  }

  const replaced = replaceStreamPlaceholders(contentString, values);
  const newContents = new TextEncoder().encode(replaced);

  // Build a new dictionary without Filter/DecodeParms since content is now uncompressed
  const newDict = PDFDict.withContext(doc.context);

  // Copy all entries except Filter, DecodeParms, and Length (we set Length ourselves)
  for (const [key, val] of streamDict.entries()) {
    const keyStr = key.toString();
    if (
      keyStr !== '/Filter' &&
      keyStr !== '/DecodeParms' &&
      keyStr !== '/Length'
    ) {
      newDict.set(key, val);
    }
  }

  // Set the new length
  newDict.set(PDFName.of('Length'), PDFNumber.of(newContents.length));

  // Create a new uncompressed raw stream and replace the original
  const newStream = PDFRawStream.of(newDict, newContents);
  doc.context.assign(ref, newStream);
}

/**
 * Fill [[placeholder]] fields in a PDF template with the given values.
 *
 * Reads the template file from disk, decompresses FlateDecode content streams,
 * replaces all [[key]] patterns with the corresponding values (properly escaped
 * for PDF text strings), and returns the modified PDF as a Uint8Array.
 *
 * @param templatePath - Path to the template PDF, relative to process.cwd()
 * @param values - Record mapping placeholder keys to their replacement values
 * @returns The filled PDF as a Uint8Array
 */
export async function fillPdfTemplate(
  templatePath: string,
  values: Record<string, string>,
): Promise<Uint8Array> {
  const absolutePath = join(/* turbopackIgnore: true */ process.cwd(), templatePath);
  const templateBytes = await readFile(absolutePath);
  const doc = await PDFDocument.load(templateBytes);

  const pages = doc.getPages();

  for (const page of pages) {
    const contentsEntry = page.node.get(PDFName.of('Contents'));

    if (!contentsEntry) {
      continue;
    }

    if (contentsEntry instanceof PDFRef) {
      // Single content stream reference
      processContentStreamRef(doc, contentsEntry, values);
    } else if (contentsEntry instanceof PDFArray) {
      // Array of content stream references
      const arr = contentsEntry as PDFArray;
      for (let i = 0; i < arr.size(); i++) {
        const element = arr.get(i);
        if (element instanceof PDFRef) {
          processContentStreamRef(doc, element, values);
        }
      }
    }
  }

  return doc.save();
}
