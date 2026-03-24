import {
  PDFDocument,
  PDFPage,
  PDFFont,
  rgb,
  type Color,
} from "pdf-lib";

// ── Constants ──────────────────────────────────────────────────────────
export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;
export const MARGIN_LEFT = 54;
export const MARGIN_RIGHT = 54;
export const MARGIN_TOP = 54;
export const MARGIN_BOTTOM = 50;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 504
export const TOP_Y = PAGE_HEIGHT - MARGIN_TOP; // 738

// ── Types ──────────────────────────────────────────────────────────────
export interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
}

export interface DrawContext {
  doc: PDFDocument;
  page: PDFPage;
  fonts: Fonts;
  y: number;
}

export interface DrawTextOptions {
  x?: number;
  size?: number;
  font?: PDFFont;
  color?: Color;
  maxWidth?: number;
}

export interface TableColumn {
  header: string;
  width: number;
  align?: "left" | "center" | "right";
}

export interface TableRow {
  cells: string[];
  bold?: boolean;
}

// ── Colors ─────────────────────────────────────────────────────────────
export const BLUE = rgb(0.13, 0.35, 0.62);
export const BLACK = rgb(0, 0, 0);
export const WHITE = rgb(1, 1, 1);
export const GRAY = rgb(0.5, 0.5, 0.5);
export const LIGHT_GRAY = rgb(0.85, 0.85, 0.85);

// ── Helpers ────────────────────────────────────────────────────────────

/** Create a new page and return the updated context. */
export function addNewPage(ctx: DrawContext): DrawContext {
  const page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  return { ...ctx, page, y: TOP_Y };
}

/** Check remaining space. If not enough, add a new page. */
export function checkPageBreak(
  ctx: DrawContext,
  needed: number,
): DrawContext {
  if (ctx.y - needed < MARGIN_BOTTOM) {
    return addNewPage(ctx);
  }
  return ctx;
}

/** Draw a single line of text. */
export function drawText(
  ctx: DrawContext,
  text: string,
  opts: DrawTextOptions = {},
): void {
  const {
    x = MARGIN_LEFT,
    size = 11,
    font = ctx.fonts.regular,
    color = BLACK,
  } = opts;
  ctx.page.drawText(text, { x, y: ctx.y, size, font, color });
}

/** Draw a filled rectangle. */
export function drawRect(
  ctx: DrawContext,
  x: number,
  y: number,
  width: number,
  height: number,
  color: Color,
): void {
  ctx.page.drawRectangle({ x, y, width, height, color });
}

/** Draw a horizontal line. */
export function drawLine(
  ctx: DrawContext,
  x1: number,
  x2: number,
  y: number,
  thickness = 0.5,
  color: Color = BLACK,
): void {
  ctx.page.drawLine({
    start: { x: x1, y },
    end: { x: x2, y },
    thickness,
    color,
  });
}

/**
 * Word-wrap text and draw it. Returns the new Y position after all lines.
 * Supports **bold** markers for inline bold text.
 */
export function drawWrappedText(
  ctx: DrawContext,
  text: string,
  opts: {
    x?: number;
    size?: number;
    font?: PDFFont;
    color?: Color;
    maxWidth?: number;
    lineHeight?: number;
    indent?: number;
    hangingIndent?: number;
  } = {},
): DrawContext {
  const {
    x = MARGIN_LEFT,
    size = 11,
    font = ctx.fonts.regular,
    color = BLACK,
    maxWidth = CONTENT_WIDTH,
    lineHeight = size + 4,
    indent = 0,
    hangingIndent = 0,
  } = opts;

  // Check if text has bold markers
  const hasBoldMarkers = text.includes("**");

  if (hasBoldMarkers) {
    return drawWrappedTextWithBold(ctx, text, {
      x: x + indent,
      size,
      regularFont: font,
      boldFont: ctx.fonts.bold,
      color,
      maxWidth: maxWidth - indent,
      lineHeight,
      hangingIndent,
    });
  }

  const words = text.split(/\s+/);
  let lineWords: string[] = [];
  let lineWidth = 0;
  const spaceWidth = font.widthOfTextAtSize(" ", size);
  let isFirstLine = true;

  for (const word of words) {
    const wordWidth = font.widthOfTextAtSize(word, size);
    const effectiveMaxWidth = isFirstLine
      ? maxWidth - indent
      : maxWidth - indent - hangingIndent;
    const testWidth =
      lineWords.length > 0 ? lineWidth + spaceWidth + wordWidth : wordWidth;

    if (testWidth > effectiveMaxWidth && lineWords.length > 0) {
      // Flush line
      ctx = checkPageBreak(ctx, lineHeight);
      const lineX = isFirstLine ? x + indent : x + indent + hangingIndent;
      ctx.page.drawText(lineWords.join(" "), {
        x: lineX,
        y: ctx.y,
        size,
        font,
        color,
      });
      ctx.y -= lineHeight;
      lineWords = [word];
      lineWidth = wordWidth;
      isFirstLine = false;
    } else {
      lineWords.push(word);
      lineWidth = testWidth;
    }
  }

  // Flush remaining
  if (lineWords.length > 0) {
    ctx = checkPageBreak(ctx, lineHeight);
    const lineX = isFirstLine ? x + indent : x + indent + hangingIndent;
    ctx.page.drawText(lineWords.join(" "), {
      x: lineX,
      y: ctx.y,
      size,
      font,
      color,
    });
    ctx.y -= lineHeight;
  }

  return ctx;
}

/** Internal: draw wrapped text with **bold** markers. */
function drawWrappedTextWithBold(
  ctx: DrawContext,
  text: string,
  opts: {
    x: number;
    size: number;
    regularFont: PDFFont;
    boldFont: PDFFont;
    color: Color;
    maxWidth: number;
    lineHeight: number;
    hangingIndent: number;
  },
): DrawContext {
  const {
    x,
    size,
    regularFont,
    boldFont,
    color,
    maxWidth,
    lineHeight,
    hangingIndent,
  } = opts;

  // Parse into segments: { text, bold }
  const segments: { text: string; bold: boolean }[] = [];
  const parts = text.split("**");
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      segments.push({ text: parts[i], bold: i % 2 === 1 });
    }
  }

  // Flatten to words with font info
  const wordEntries: { word: string; font: PDFFont }[] = [];
  for (const seg of segments) {
    const font = seg.bold ? boldFont : regularFont;
    const words = seg.text.split(/\s+/).filter(Boolean);
    for (const w of words) {
      wordEntries.push({ word: w, font });
    }
  }

  let lineEntries: typeof wordEntries = [];
  let lineWidth = 0;
  const spaceWidth = regularFont.widthOfTextAtSize(" ", size);
  let isFirstLine = true;

  const flushLine = () => {
    if (lineEntries.length === 0) return;
    ctx = checkPageBreak(ctx, lineHeight);
    const lineX = isFirstLine ? x : x + hangingIndent;
    let curX = lineX;
    for (let i = 0; i < lineEntries.length; i++) {
      const entry = lineEntries[i];
      ctx.page.drawText(entry.word, {
        x: curX,
        y: ctx.y,
        size,
        font: entry.font,
        color,
      });
      curX += entry.font.widthOfTextAtSize(entry.word, size);
      if (i < lineEntries.length - 1) {
        curX += spaceWidth;
      }
    }
    ctx.y -= lineHeight;
    isFirstLine = false;
  };

  for (const entry of wordEntries) {
    const wordWidth = entry.font.widthOfTextAtSize(entry.word, size);
    const effectiveMaxWidth = isFirstLine
      ? maxWidth
      : maxWidth - hangingIndent;
    const testWidth =
      lineEntries.length > 0
        ? lineWidth + spaceWidth + wordWidth
        : wordWidth;

    if (testWidth > effectiveMaxWidth && lineEntries.length > 0) {
      flushLine();
      lineEntries = [entry];
      lineWidth = wordWidth;
    } else {
      lineEntries.push(entry);
      lineWidth = testWidth;
    }
  }

  flushLine();
  return ctx;
}

/**
 * Draw a bordered table. Returns the updated context.
 */
export function drawTable(
  ctx: DrawContext,
  columns: TableColumn[],
  rows: TableRow[],
  opts: {
    x?: number;
    fontSize?: number;
    headerFontSize?: number;
    rowHeight?: number;
    headerHeight?: number;
    headerBg?: Color;
    headerColor?: Color;
    borderColor?: Color;
    cellPadding?: number;
  } = {},
): DrawContext {
  const {
    x = MARGIN_LEFT,
    fontSize = 9,
    headerFontSize = 9,
    rowHeight = 16,
    headerHeight = 20,
    headerBg = LIGHT_GRAY,
    headerColor = BLACK,
    borderColor = BLACK,
    cellPadding = 4,
  } = opts;

  const totalWidth = columns.reduce((sum, c) => sum + c.width, 0);
  const totalHeight = headerHeight + rows.length * rowHeight;

  // Check if entire table fits; if not, start new page
  ctx = checkPageBreak(ctx, totalHeight);

  const startY = ctx.y;

  // Draw header background
  drawRect(ctx, x, startY - headerHeight, totalWidth, headerHeight, headerBg);

  // Draw header text
  let colX = x;
  for (const col of columns) {
    ctx.page.drawText(col.header, {
      x: colX + cellPadding,
      y: startY - headerHeight + (headerHeight - headerFontSize) / 2 + 1,
      size: headerFontSize,
      font: ctx.fonts.bold,
      color: headerColor,
    });
    colX += col.width;
  }

  // Draw rows
  let rowY = startY - headerHeight;
  for (const row of rows) {
    colX = x;
    const font = row.bold ? ctx.fonts.bold : ctx.fonts.regular;
    for (let i = 0; i < columns.length; i++) {
      const cell = row.cells[i] ?? "";
      const col = columns[i];
      let textX = colX + cellPadding;
      if (col.align === "right") {
        const textW = font.widthOfTextAtSize(cell, fontSize);
        textX = colX + col.width - cellPadding - textW;
      } else if (col.align === "center") {
        const textW = font.widthOfTextAtSize(cell, fontSize);
        textX = colX + (col.width - textW) / 2;
      }
      ctx.page.drawText(cell, {
        x: textX,
        y: rowY - rowHeight + (rowHeight - fontSize) / 2 + 1,
        size: fontSize,
        font,
        color: BLACK,
      });
      colX += col.width;
    }
    rowY -= rowHeight;
  }

  // Draw borders
  const endY = startY - totalHeight;

  // Outer border
  ctx.page.drawRectangle({
    x,
    y: endY,
    width: totalWidth,
    height: totalHeight,
    borderColor,
    borderWidth: 0.5,
    color: rgb(1, 1, 1),
    opacity: 0,
  });

  // Horizontal lines
  drawLine(ctx, x, x + totalWidth, startY - headerHeight, 0.5, borderColor);
  for (let r = 1; r < rows.length; r++) {
    const ly = startY - headerHeight - r * rowHeight;
    drawLine(ctx, x, x + totalWidth, ly, 0.25, borderColor);
  }

  // Vertical lines
  colX = x;
  for (let c = 0; c <= columns.length; c++) {
    ctx.page.drawLine({
      start: { x: colX, y: startY },
      end: { x: colX, y: endY },
      thickness: 0.5,
      color: borderColor,
    });
    if (c < columns.length) colX += columns[c].width;
  }

  ctx.y = endY - 4;
  return ctx;
}

/**
 * Draw a simple two-column label/value list (like Reservation Info).
 */
export function drawLabelValueList(
  ctx: DrawContext,
  items: { label: string; value: string }[],
  opts: {
    x?: number;
    labelWidth?: number;
    size?: number;
    lineHeight?: number;
  } = {},
): DrawContext {
  const {
    x = MARGIN_LEFT + 36,
    labelWidth = 180,
    size = 11,
    lineHeight = 15,
  } = opts;

  for (const item of items) {
    ctx = checkPageBreak(ctx, lineHeight);
    ctx.page.drawText(item.label, {
      x,
      y: ctx.y,
      size,
      font: ctx.fonts.regular,
      color: BLACK,
    });
    ctx.page.drawText(item.value, {
      x: x + labelWidth,
      y: ctx.y,
      size,
      font: ctx.fonts.regular,
      color: BLACK,
    });
    ctx.y -= lineHeight;
  }

  return ctx;
}
