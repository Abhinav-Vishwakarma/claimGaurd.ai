// pdf-parse ships as CJS. When required in an ESM/ts-node context the module can
// be wrapped, so the callable may live at .default. We normalise that here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _pdfParseRaw = require('pdf-parse');
type PdfParseResult = { text: string; numpages: number; numrender: number; info: unknown; metadata: unknown; version: string };
const pdfParse: (buffer: Buffer) => Promise<PdfParseResult> =
  typeof _pdfParseRaw === 'function' ? _pdfParseRaw : _pdfParseRaw.default;

// ─── Types ────────────────────────────────────────────────────────────────────

export type FileCategory = 'pdf' | 'docx' | 'image' | 'unknown';

export type ParsedDocument = {
  text: string;
  charCount: number;
  pageCount?: number;
  method: 'pdf_parse' | 'mammoth_docx';
};

// ─── File type detection ──────────────────────────────────────────────────────

/**
 * Determines the file category from the filename extension and/or MIME type.
 * Images are sent to Gemini vision; PDFs/DOCX are parsed locally.
 */
export const detectFileCategory = (filename: string, mimeType?: string): FileCategory => {
  const ext = filename.toLowerCase().split('.').pop() ?? '';

  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf';

  if (
    ext === 'docx' ||
    ext === 'doc' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return 'docx';
  }

  if (
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'heic', 'heif'].includes(ext) ||
    mimeType?.startsWith('image/')
  ) {
    return 'image';
  }

  return 'unknown';
};

// ─── Local text extraction ────────────────────────────────────────────────────

/**
 * Extracts plain text from a PDF or DOCX buffer using local libraries.
 * Never calls any external AI service.
 */
export const parseDocumentLocally = async (
  buffer: Buffer,
  fileCategory: 'pdf' | 'docx',
): Promise<ParsedDocument> => {
  if (fileCategory === 'pdf') {
    // pdf-parse: fast, no external calls, handles multi-page PDFs
    const data = await pdfParse(buffer);
    return {
      text: data.text.trim(),
      charCount: data.text.length,
      pageCount: data.numpages,
      method: 'pdf_parse',
    };
  }

  if (fileCategory === 'docx') {
    // mammoth: extracts raw text from .docx/.doc
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value.trim(),
      charCount: result.value.length,
      method: 'mammoth_docx',
    };
  }

  throw new Error(`Unsupported file category for local parsing: ${fileCategory}`);
};
