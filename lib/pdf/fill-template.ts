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
 * Decode a PDF stream, honoring a single filter or a filter chain.
 * Supports FlateDecode, ASCII85Decode, ASCIIHexDecode. Returns the original
 * bytes if the filter list is empty or unrecognized filters appear.
 */
function decodeStream(data: Uint8Array, dict: PDFDict): Uint8Array {
  const filter = dict.get(PDFName.of('Filter'));
  if (!filter) return data;

  const names: string[] = [];
  if (filter instanceof PDFArray) {
    for (let i = 0; i < filter.size(); i++) {
      names.push(filter.get(i).toString());
    }
  } else {
    names.push(filter.toString());
  }

  let bytes = data;
  for (const name of names) {
    if (name === '/FlateDecode') {
      bytes = new Uint8Array(inflateSync(bytes));
    } else if (name === '/ASCII85Decode') {
      bytes = ascii85Decode(bytes);
    } else if (name === '/ASCIIHexDecode') {
      bytes = asciiHexDecode(bytes);
    } else {
      return data;
    }
  }
  return bytes;
}

function ascii85Decode(data: Uint8Array): Uint8Array {
  let s = new TextDecoder('latin1').decode(data).replace(/\s+/g, '');
  if (s.startsWith('<~')) s = s.slice(2);
  if (s.endsWith('~>')) s = s.slice(0, -2);

  const out: number[] = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === 'z') {
      out.push(0, 0, 0, 0);
      i++;
      continue;
    }
    const chunk = s.slice(i, i + 5);
    i += 5;
    const pad = 5 - chunk.length;
    const padded = chunk + 'uuuuu'.slice(0, pad);
    let num = 0;
    for (let k = 0; k < 5; k++) {
      num = num * 85 + (padded.charCodeAt(k) - 33);
    }
    const b = [
      (num >>> 24) & 0xff,
      (num >>> 16) & 0xff,
      (num >>> 8) & 0xff,
      num & 0xff,
    ];
    for (let k = 0; k < 4 - pad; k++) out.push(b[k]);
  }
  return new Uint8Array(out);
}

function asciiHexDecode(data: Uint8Array): Uint8Array {
  let s = new TextDecoder('latin1').decode(data).replace(/\s+/g, '');
  if (s.endsWith('>')) s = s.slice(0, -1);
  if (s.length % 2) s += '0';
  const out = new Uint8Array(s.length / 2);
  for (let k = 0; k < out.length; k++) {
    out[k] = parseInt(s.substr(k * 2, 2), 16);
  }
  return out;
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
      const bytes = decodeStream(obj.contents, obj.dict);
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

// 2D affine matrix in PDF convention: [a b 0 ; c d 0 ; e f 1].
type Mat = readonly [number, number, number, number, number, number];
const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

/**
 * Row-vector post-multiplication (PDF convention).
 * For nested `cm`: newCTM = mul(innerOperandMatrix, outerCTM).
 */
function mul(m1: Mat, m2: Mat): Mat {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + b1 * c2,
    a1 * b2 + b1 * d2,
    c1 * a2 + d1 * c2,
    c1 * b2 + d1 * d2,
    e1 * a2 + f1 * c2 + e2,
    e1 * b2 + f1 * d2 + f2,
  ];
}

/** Origin (0,0) through an affine matrix → (e, f). */
function originOf(m: Mat): { x: number; y: number } {
  return { x: m[4], y: m[5] };
}

function translate(tx: number, ty: number): Mat {
  return [1, 0, 0, 1, tx, ty];
}

type Token =
  | { type: 'num'; value: number }
  | { type: 'name'; value: string }
  | { type: 'str'; value: string }
  | { type: 'hex'; value: string }
  | { type: 'array'; raw: string }
  | { type: 'op'; value: string };

const WHITESPACE = new Set(['\0', '\t', '\n', '\f', '\r', ' ']);
const DELIMITERS = new Set(['(', ')', '<', '>', '[', ']', '{', '}', '/', '%']);

function isWhitespace(ch: string): boolean {
  return WHITESPACE.has(ch);
}

function isDelimiter(ch: string): boolean {
  return DELIMITERS.has(ch);
}

function isNumberStart(ch: string, next: string): boolean {
  if (ch >= '0' && ch <= '9') return true;
  if (ch === '.' && next >= '0' && next <= '9') return true;
  if ((ch === '+' || ch === '-') && (next === '.' || (next >= '0' && next <= '9'))) {
    return true;
  }
  return false;
}

/**
 * Resolve PDF string escape sequences inside a `(...)` literal.
 */
function decodeStringEscapes(body: string): string {
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = body[i + 1];
    if (next === undefined) break;
    switch (next) {
      case 'n': out += '\n'; i += 1; break;
      case 'r': out += '\r'; i += 1; break;
      case 't': out += '\t'; i += 1; break;
      case 'b': out += '\b'; i += 1; break;
      case 'f': out += '\f'; i += 1; break;
      case '(':
      case ')':
      case '\\':
        out += next; i += 1; break;
      case '\n':
        i += 1; break;
      case '\r':
        i += 1;
        if (body[i + 1] === '\n') i += 1;
        break;
      default:
        if (next >= '0' && next <= '7') {
          let oct = next;
          let consumed = 1;
          for (let k = 2; k <= 3; k++) {
            const d = body[i + k];
            if (d !== undefined && d >= '0' && d <= '7') {
              oct += d;
              consumed += 1;
            } else {
              break;
            }
          }
          out += String.fromCharCode(parseInt(oct, 8) & 0xff);
          i += consumed;
        } else {
          out += next;
          i += 1;
        }
        break;
    }
  }
  return out;
}

/**
 * Tokenize a PDF content stream. Walks the latin1 source once and yields
 * typed tokens. Hand-written scanner because balanced `(…)` strings with
 * escapes cannot be parsed safely with regex.
 */
function* tokenize(s: string): Generator<Token> {
  let i = 0;
  const n = s.length;

  while (i < n) {
    const ch = s[i];

    if (isWhitespace(ch)) {
      i += 1;
      continue;
    }

    // Comment: skip to end of line.
    if (ch === '%') {
      while (i < n && s[i] !== '\n' && s[i] !== '\r') i += 1;
      continue;
    }

    // String literal: balanced parens with escapes.
    if (ch === '(') {
      let depth = 1;
      let j = i + 1;
      let body = '';
      while (j < n && depth > 0) {
        const c = s[j];
        if (c === '\\') {
          body += c;
          const nx = s[j + 1];
          if (nx !== undefined) {
            body += nx;
            j += 2;
            continue;
          }
          j += 1;
          continue;
        }
        if (c === '(') {
          depth += 1;
          body += c;
          j += 1;
          continue;
        }
        if (c === ')') {
          depth -= 1;
          if (depth === 0) {
            j += 1;
            break;
          }
          body += c;
          j += 1;
          continue;
        }
        body += c;
        j += 1;
      }
      yield { type: 'str', value: decodeStringEscapes(body) };
      i = j;
      continue;
    }

    // `<<` dict-open, `<hex>` string.
    if (ch === '<') {
      if (s[i + 1] === '<') {
        yield { type: 'op', value: '<<' };
        i += 2;
        continue;
      }
      let j = i + 1;
      let body = '';
      while (j < n && s[j] !== '>') {
        if (!isWhitespace(s[j])) body += s[j];
        j += 1;
      }
      if (j < n && s[j] === '>') j += 1;
      yield { type: 'hex', value: body };
      i = j;
      continue;
    }

    // `>>` dict-close — consume so it doesn't turn into an unknown op.
    if (ch === '>') {
      if (s[i + 1] === '>') {
        yield { type: 'op', value: '>>' };
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    // Array literal — keep raw body, but track nested strings/arrays so
    // a `]` inside a `(...)` literal doesn't close it prematurely.
    if (ch === '[') {
      let j = i + 1;
      let depth = 1;
      let body = '';
      while (j < n && depth > 0) {
        const c = s[j];
        if (c === '[') {
          depth += 1;
          body += c;
          j += 1;
          continue;
        }
        if (c === ']') {
          depth -= 1;
          if (depth === 0) {
            j += 1;
            break;
          }
          body += c;
          j += 1;
          continue;
        }
        if (c === '(') {
          let pd = 1;
          body += c;
          j += 1;
          while (j < n && pd > 0) {
            const cc = s[j];
            if (cc === '\\') {
              body += cc;
              if (s[j + 1] !== undefined) body += s[j + 1];
              j += 2;
              continue;
            }
            if (cc === '(') pd += 1;
            else if (cc === ')') pd -= 1;
            body += cc;
            j += 1;
            if (pd === 0) break;
          }
          continue;
        }
        body += c;
        j += 1;
      }
      yield { type: 'array', raw: body };
      i = j;
      continue;
    }

    // Name: `/identifier`.
    if (ch === '/') {
      let j = i + 1;
      let name = '';
      while (j < n && !isWhitespace(s[j]) && !isDelimiter(s[j])) {
        name += s[j];
        j += 1;
      }
      yield { type: 'name', value: name };
      i = j;
      continue;
    }

    // Number literal.
    const next = s[i + 1] ?? '';
    if (isNumberStart(ch, next)) {
      let j = i + 1;
      while (
        j < n &&
        !isWhitespace(s[j]) &&
        !isDelimiter(s[j]) &&
        /[0-9.+\-eE]/.test(s[j])
      ) {
        j += 1;
      }
      const raw = s.slice(i, j);
      const val = parseFloat(raw);
      if (Number.isFinite(val)) {
        yield { type: 'num', value: val };
        i = j;
        continue;
      }
    }

    // Operator: run of non-whitespace, non-delimiter characters.
    {
      let j = i;
      while (j < n && !isWhitespace(s[j]) && !isDelimiter(s[j])) {
        j += 1;
      }
      if (j === i) {
        i += 1;
        continue;
      }
      yield { type: 'op', value: s.slice(i, j) };
      i = j;
    }
  }
}

interface TextBlock {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  positioned: boolean;
}

interface ParserState {
  ctmStack: Mat[];
  ctm: Mat;
  tm: Mat;
  tlm: Mat;
  leading: number;
  fontSize: number;
  operands: Token[];
}

function takeNums(operands: Token[], count: number): number[] | null {
  if (operands.length < count) return null;
  const slice = operands.slice(operands.length - count);
  const nums: number[] = [];
  for (const t of slice) {
    if (t.type !== 'num') return null;
    nums.push(t.value);
  }
  return nums;
}

function capturePosition(state: ParserState, block: TextBlock): void {
  if (block.positioned) return;
  const p = originOf(mul(state.tm, state.ctm));
  block.x = p.x;
  block.y = p.y;
  block.fontSize = state.fontSize;
  block.positioned = true;
}

/** Decode a PDF hex string (e.g. `4142` → `"AB"`). Odd final nibble pads with 0. */
function hexToString(hex: string): string {
  let out = '';
  let padded = hex;
  if (padded.length % 2 === 1) padded += '0';
  for (let i = 0; i < padded.length; i += 2) {
    const code = parseInt(padded.slice(i, i + 2), 16);
    if (Number.isFinite(code)) out += String.fromCharCode(code);
  }
  return out;
}

/**
 * Parse a content stream and find all [[placeholder]] patterns, tracking
 * graphics-state (`q`/`Q`/`cm`) and text-state matrices so positions are
 * expressed in user-space coordinates even when the authoring tool nests
 * `cm` transforms around `BT…ET`.
 *
 * Placeholders are frequently split across consecutive text-showing ops
 * with kerning values; block text is concatenated and scanned with a
 * single regex so matches spanning operator boundaries are still found.
 */
function findPlaceholderLocations(contentStream: string): PlaceholderLocation[] {
  const state: ParserState = {
    ctmStack: [],
    ctm: IDENTITY,
    tm: IDENTITY,
    tlm: IDENTITY,
    leading: 0,
    fontSize: 11,
    operands: [],
  };

  const blocks: TextBlock[] = [];
  let active: TextBlock | null = null;

  const appendText = (t: string): void => {
    if (!active) return;
    capturePosition(state, active);
    active.text += t;
  };

  for (const tok of tokenize(contentStream)) {
    if (tok.type !== 'op') {
      state.operands.push(tok);
      continue;
    }

    const op = tok.value;
    switch (op) {
      case 'q': {
        state.ctmStack.push(state.ctm);
        break;
      }
      case 'Q': {
        state.ctm = state.ctmStack.pop() ?? IDENTITY;
        break;
      }
      case 'cm': {
        const nums = takeNums(state.operands, 6);
        if (nums) {
          const m: Mat = [nums[0], nums[1], nums[2], nums[3], nums[4], nums[5]];
          state.ctm = mul(m, state.ctm);
        }
        break;
      }
      case 'BT': {
        state.tm = IDENTITY;
        state.tlm = IDENTITY;
        active = {
          text: '',
          x: 0,
          y: 0,
          fontSize: state.fontSize,
          positioned: false,
        };
        break;
      }
      case 'ET': {
        if (active && active.text.length > 0) {
          blocks.push(active);
        }
        active = null;
        break;
      }
      case 'Tm': {
        const nums = takeNums(state.operands, 6);
        if (nums) {
          const m: Mat = [nums[0], nums[1], nums[2], nums[3], nums[4], nums[5]];
          state.tm = m;
          state.tlm = m;
        }
        break;
      }
      case 'Td': {
        const nums = takeNums(state.operands, 2);
        if (nums) {
          state.tlm = mul(translate(nums[0], nums[1]), state.tlm);
          state.tm = state.tlm;
        }
        break;
      }
      case 'TD': {
        const nums = takeNums(state.operands, 2);
        if (nums) {
          state.leading = -nums[1];
          state.tlm = mul(translate(nums[0], nums[1]), state.tlm);
          state.tm = state.tlm;
        }
        break;
      }
      case 'T*': {
        state.tlm = mul(translate(0, -state.leading), state.tlm);
        state.tm = state.tlm;
        break;
      }
      case 'TL': {
        const nums = takeNums(state.operands, 1);
        if (nums) state.leading = nums[0];
        break;
      }
      case 'Tf': {
        const ops = state.operands;
        if (ops.length >= 2) {
          const size = ops[ops.length - 1];
          const name = ops[ops.length - 2];
          if (size.type === 'num' && name.type === 'name') {
            state.fontSize = size.value;
          }
        }
        break;
      }
      case 'Tj': {
        const ops = state.operands;
        if (ops.length >= 1) {
          const s = ops[ops.length - 1];
          if (s.type === 'str') appendText(s.value);
          else if (s.type === 'hex') appendText(hexToString(s.value));
        }
        break;
      }
      case 'TJ': {
        const ops = state.operands;
        if (ops.length >= 1) {
          const arr = ops[ops.length - 1];
          if (arr.type === 'array') {
            appendText(extractTextFromTJ(arr.raw));
          }
        }
        break;
      }
      case "'": {
        state.tlm = mul(translate(0, -state.leading), state.tlm);
        state.tm = state.tlm;
        const ops = state.operands;
        if (ops.length >= 1) {
          const s = ops[ops.length - 1];
          if (s.type === 'str') appendText(s.value);
          else if (s.type === 'hex') appendText(hexToString(s.value));
        }
        break;
      }
      case '"': {
        state.tlm = mul(translate(0, -state.leading), state.tlm);
        state.tm = state.tlm;
        const ops = state.operands;
        if (ops.length >= 1) {
          const s = ops[ops.length - 1];
          if (s.type === 'str') appendText(s.value);
          else if (s.type === 'hex') appendText(hexToString(s.value));
        }
        break;
      }
      default:
        break;
    }

    state.operands = [];
  }

  // Concatenate all block text and find [[key]] patterns using regex.
  // This handles cases where [[ is split across blocks (e.g. "[" in one
  // block and "[key]]" in the next).
  let allText = '';
  const blockOffsets: { textStart: number; block: TextBlock }[] = [];

  for (const block of blocks) {
    blockOffsets.push({ textStart: allText.length, block });
    allText += block.text;
  }

  const locations: PlaceholderLocation[] = [];
  const placeholderRegex = /\[\[(\w+)\]\]/g;
  let regexMatch: RegExpExecArray | null;

  while ((regexMatch = placeholderRegex.exec(allText)) !== null) {
    const key = regexMatch[1];
    const matchStart = regexMatch.index;

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

/** Escape characters that have special meaning inside a PDF `(...)` literal. */
function pdfEscapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Regex-escape a literal for embedding inside a dynamic RegExp. */
function reEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * For placeholders that appear as complete `([[key]]) Tj` string literals in
 * the content stream, substitute them in place with the value. This lets the
 * PDF's own text layout engine render them at the correct position — critical
 * when the placeholder is inline inside a multi-line paragraph (where overlay
 * at a single captured coordinate would land on the wrong line).
 *
 * Also strips long leading `___+` runs from any string in the stream, since
 * those are blank-fill lines that become redundant once the value is filled.
 *
 * Returns the set of keys that were substituted; the caller skips overlay for
 * those. Placeholders split across kerning Tjs (Word-authored templates) won't
 * match and fall through to the overlay path.
 */
function substitutePlaceholdersInStream(
  doc: PDFDocument,
  pageNode: ReturnType<PDFDocument['getPages']>[0]['node'],
  values: Record<string, string>,
): Set<string> {
  const substituted = new Set<string>();

  const contentsEntry = pageNode.get(PDFName.of('Contents'));
  if (!contentsEntry) return substituted;

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

    const bytes = decodeStream(obj.contents, obj.dict);
    let text = new TextDecoder('latin1').decode(bytes);
    let modified = false;

    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === '') continue;
      const literal = `([[${key}]])`;
      if (!text.includes(literal)) continue;

      const pattern = new RegExp(
        `\\(\\[\\[${reEscape(key)}\\]\\]\\)\\s*Tj`,
        'g',
      );
      const replacement = `0 0 0 rg (${pdfEscapeString(value)}) Tj`;
      text = text.replace(pattern, replacement);
      substituted.add(key);
      modified = true;
    }

    // Strip leading `___+` fill-lines from any string literal. Conservative:
    // only matches at the start of a string, and requires 3+ underscores.
    const underscoreRe = /\(_{3,}([^)\\]*(?:\\.[^)\\]*)*)\)/g;
    if (underscoreRe.test(text)) {
      text = text.replace(underscoreRe, '($1)');
      modified = true;
    }

    if (!modified) continue;

    const encoded = new TextEncoder().encode(text);
    const newDict = PDFDict.withContext(doc.context);
    for (const [k, v] of obj.dict.entries()) {
      const kStr = k.toString();
      if (kStr !== '/Filter' && kStr !== '/DecodeParms' && kStr !== '/Length') {
        newDict.set(k, v);
      }
    }
    newDict.set(PDFName.of('Length'), PDFNumber.of(encoded.length));
    doc.context.assign(ref, PDFRawStream.of(newDict, encoded));
  }

  return substituted;
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

    const bytes = decodeStream(obj.contents, obj.dict);
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
    // Substitute complete-literal placeholders directly in the content stream
    // so the PDF renders them at their native position (handles inline-in-paragraph).
    const substituted = substitutePlaceholdersInStream(doc, page.node, values);

    // Any remaining placeholders (split across kerning Tjs in Word templates)
    // are handled via drawText overlay at the parser-computed position.
    const stream = getPageContentStream(doc, page.node);
    const placeholders = findPlaceholderLocations(stream);

    // Strip decorative dash text BEFORE drawText (which appends new streams)
    stripDashesFromPage(doc, page.node);

    for (const ph of placeholders) {
      if (substituted.has(ph.key)) continue;
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
