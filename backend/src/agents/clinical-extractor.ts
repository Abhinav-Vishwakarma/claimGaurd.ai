import { aiService } from '../api/ai/ai.service';
import { detectFileCategory, parseDocumentLocally } from '../utils/document-parser';
import type { AgentSession } from '../utils/agent-session';
import type { ServiceMap } from '../api/ocr/ocr.types';

// ─── Prompts ──────────────────────────────────────────────────────────────────

const BASE_SCHEMA = `{
  "metadata": {
    "patient_id": "<string or null>",
    "date_of_service": "<YYYY-MM-DD or null>",
    "provider_npi": "<string or null>",
    "claim_type": "<PPO|HMO|Medicare|Medicaid|etc or null>"
  },
  "triangulation_data": {
    "prescription": {
      "ordered_service": "<e.g. Chest X-Ray or null>",
      "reason": "<e.g. Suspected Pneumonia or null>",
      "signature_verified": "<true|false|null>"
    },
    "lab_report": {
      "performed_service": "<e.g. CPT 71045 or null>",
      "findings_summary": "<e.g. No signs of consolidation or null>",
      "vitals": "<object like { BP: '120/80' } or null>"
    },
    "billing": {
      "cpt_codes": ["<array of CPT code strings>"],
      "billed_amount": "<number or null>"
    }
  },
  "predictive_signals": {
    "risk_factors": ["<array of risk factor strings>"],
    "comorbidities": ["<array of comorbidity strings>"],
    "next_recommended_visit": "<e.g. 90 days or null>"
  }
}`;

const RULES = `STRICT RULES:
1. Return ONLY a raw JSON object — NO markdown, NO code fences, NO explanation text.
2. Use null for any field you cannot find in the document.
3. Do NOT hallucinate or invent data. Only extract what is present.
4. cpt_codes must be an array of strings (can be empty []).
5. risk_factors and comorbidities must be arrays of strings (can be empty []).`;

/**
 * Prompt used when text has been extracted locally (PDF/DOCX path).
 * Sends extracted text to an LLM for structured parsing — no vision needed.
 */
const buildTextExtractionPrompt = (
  docType: string,
  extractedText: string,
  filename: string,
): string => `You are a medical claim document intelligence engine.

Document type: ${docType}
Source file: ${filename}
Extraction method: LOCAL TEXT EXTRACTION (PDF/DOCX parsed server-side — no OCR required)

Extracted document text:
--- BEGIN DOCUMENT TEXT ---
${extractedText.slice(0, 12000)}${extractedText.length > 12000 ? '\n[... truncated for length ...]' : ''}
--- END DOCUMENT TEXT ---

${RULES}

Return exactly this JSON schema:
${BASE_SCHEMA}`;

/**
 * Prompt used when a raw image is sent directly to Gemini Vision.
 */
const buildVisionPrompt = (docType: string): string =>
  `You are a medical claim document intelligence engine.

Document type: ${docType}

Your ONLY job is to extract structured data from the attached medical document image.

${RULES}

Return exactly this JSON schema:
${BASE_SCHEMA}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetchBuffer = async (url: string): Promise<{ buffer: Buffer; mimeType: string }> => {
  const response = await fetch(url);
  if (!response.ok) {
    const err = new Error(`Failed to fetch document: ${response.statusText}`);
    Object.assign(err, { status: 502 });
    throw err;
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = response.headers.get('content-type') || 'application/octet-stream';
  return { buffer, mimeType: mimeType.split(';')[0].trim() };
};

const parseServiceMap = (text: string): ServiceMap => {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as ServiceMap;
  } catch {
    const err = new Error(
      `AI returned unparseable output. Raw: ${cleaned.slice(0, 200)}`,
    );
    Object.assign(err, { status: 422 });
    throw err;
  }
};

// ─── Agent ───────────────────────────────────────────────────────────────────

export type ExtractionInput = {
  fileUrl: string;
  filename: string;
  docType: 'prescription' | 'bill' | 'lab_report';
  session?: AgentSession; // optional — used when called from the full pipeline
};

export const clinicalExtractor = {
  /**
   * Smart extraction router:
   *  - PDF / DOCX → local text extraction (pdf-parse / mammoth) → Groq text LLM
   *  - Image       → Gemini Vision (base64 inline)
   *
   * Emits AgentSession events if a session is provided.
   */
  extract: async (input: ExtractionInput): Promise<ServiceMap> => {
    const { fileUrl, filename, docType, session } = input;

    // ── Step 1: Fetch the file ─────────────────────────────────────────────
    const { buffer, mimeType } = await fetchBuffer(fileUrl);
    const fileCategory = detectFileCategory(filename, mimeType);

    // ── Step 2: Route based on file type ──────────────────────────────────
    if (fileCategory === 'pdf' || fileCategory === 'docx') {
      // ── LOCAL EXTRACTION PATH (PDF / DOCX) ────────────────────────────
      const methodLabel = fileCategory === 'pdf' ? 'pdf-parse' : 'mammoth (DOCX)';

      session?.emit({
        agent: 'agent_1',
        type: 'TOOL_CALL',
        tool: `local_${fileCategory}_parser`,
        message: `📄 ${filename} is a ${fileCategory.toUpperCase()} — extracting text locally via ${methodLabel} (skipping LLM OCR)`,
      });

      let parsed;
      try {
        parsed = await parseDocumentLocally(buffer, fileCategory);
      } catch (parseErr) {
        session?.emit({
          agent: 'agent_1',
          type: 'TOOL_RESULT',
          tool: `local_${fileCategory}_parser`,
          message: `⚠️ Local parsing failed: ${(parseErr as Error).message} — falling back to LLM vision`,
        });
        // Fallback: treat as image and send to Gemini anyway
        return clinicalExtractor.extract({ ...input, session: undefined });
      }

      session?.emit({
        agent: 'agent_1',
        type: 'TOOL_RESULT',
        tool: `local_${fileCategory}_parser`,
        message: `✅ Local extraction complete — ${parsed.charCount.toLocaleString()} characters${parsed.pageCount ? `, ${parsed.pageCount} pages` : ''} extracted. Sending text to Groq for structured parsing...`,
      });

      if (!parsed.text || parsed.text.length < 20) {
        // Scanned PDF with no embedded text — fall back to Gemini Vision
        session?.emit({
          agent: 'agent_1',
          type: 'AGENT_THINKING',
          message: `⚠️ No embedded text found in ${filename} (likely a scanned PDF image) — switching to Gemini Vision OCR`,
        });

        session?.emit({
          agent: 'agent_1',
          type: 'TOOL_CALL',
          tool: 'gemini_vision',
          message: 'Falling back: sending scanned PDF as image to Gemini Vision...',
        });

        return clinicalExtractor._extractViaGeminiVision({ buffer, mimeType: 'application/pdf', filename, docType, session });
      }

      // Send extracted text to Groq (fast, cheap, no vision needed)
      session?.emit({
        agent: 'agent_1',
        type: 'TOOL_CALL',
        tool: 'groq_text_parser',
        message: `Sending ${parsed.charCount.toLocaleString()} chars of extracted text to Groq (llama-3.3-70b) for structured JSON extraction...`,
      });

      try {
        const result = await aiService.generate({
          service: 'groq',
          prompt: buildTextExtractionPrompt(docType, parsed.text, filename),
          options: { temperature: 0.0, maxTokens: 2048 },
        });

        const serviceMap = parseServiceMap(result.text);

        session?.emit({
          agent: 'agent_1',
          type: 'TOOL_RESULT',
          tool: 'groq_text_parser',
          message: `✅ Structured extraction complete via Groq — patient: ${serviceMap.metadata.patient_id ?? 'unknown'}, CPTs: [${serviceMap.triangulation_data.billing.cpt_codes.join(', ') || 'none detected'}]`,
        });

        return serviceMap;
      } catch (groqErr) {
        // Groq failed — fall back to Gemini text-only
        session?.emit({
          agent: 'agent_1',
          type: 'AGENT_THINKING',
          message: `Groq parsing failed, retrying with Gemini text mode...`,
        });

        const geminiTextResult = await aiService.generate({
          service: 'google',
          prompt: buildTextExtractionPrompt(docType, parsed.text, filename),
          options: { temperature: 0.0, maxTokens: 2048 },
        });

        return parseServiceMap(geminiTextResult.text);
      }

    } else {
      // ── VISION PATH (images, unknown types) ───────────────────────────
      session?.emit({
        agent: 'agent_1',
        type: 'TOOL_CALL',
        tool: 'gemini_vision',
        message: `🖼️ ${filename} is an image (${mimeType}) — sending to Google Gemini Vision for OCR extraction...`,
      });

      const serviceMap = await clinicalExtractor._extractViaGeminiVision({ buffer, mimeType, filename, docType, session });

      session?.emit({
        agent: 'agent_1',
        type: 'TOOL_RESULT',
        tool: 'gemini_vision',
        message: `✅ Vision OCR complete — patient: ${serviceMap.metadata.patient_id ?? 'unknown'}, CPTs: [${serviceMap.triangulation_data.billing.cpt_codes.join(', ') || 'none detected'}]`,
      });

      return serviceMap;
    }
  },

  /** Internal: send a buffer to Gemini Vision */
  _extractViaGeminiVision: async (input: {
    buffer: Buffer;
    mimeType: string;
    filename: string;
    docType: string;
    session?: AgentSession;
  }): Promise<ServiceMap> => {
    const { buffer, mimeType, filename, docType, session } = input;
    const base64 = buffer.toString('base64');

    try {
      const result = await aiService.generate({
        service: 'google',
        prompt: buildVisionPrompt(docType),
        attachments: [{ filename, mimeType, dataBase64: base64 }],
        options: { temperature: 0.1, maxTokens: 2048 },
      });
      return parseServiceMap(result.text);
    } catch (googleErr) {
      // Fallback: Groq text-only (no attachment support)
      console.warn('[ClinicalExtractor] Gemini Vision failed — falling back to Groq text-only:', googleErr);
      const fallback = await aiService.generate({
        service: 'groq',
        prompt: `${buildVisionPrompt(docType)}\n\nNote: Image could not be attached. Filename: "${filename}". Extract what you can; use null for all unknown fields.`,
        options: { temperature: 0.1, maxTokens: 2048 },
      });
      return parseServiceMap(fallback.text);
    }
  },
};
