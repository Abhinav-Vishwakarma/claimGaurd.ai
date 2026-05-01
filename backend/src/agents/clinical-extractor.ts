import { aiService } from '../api/ai/ai.service';
import type { ServiceMap } from '../api/ocr/ocr.types';

// ─── Extraction prompt ────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are a medical claim document intelligence engine.

Your ONLY job is to extract structured data from the attached medical document.

STRICT RULES:
1. Return ONLY a raw JSON object — NO markdown, NO code fences, NO explanation text.
2. Use null for any field you cannot find in the document.
3. Do NOT hallucinate or invent data. Only extract what is present.
4. cpt_codes must be an array of strings (can be empty []).
5. risk_factors and comorbidities must be arrays of strings (can be empty []).

Return exactly this JSON schema:
{
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
      "vitals": "<object like { BP: 120/80 } or null>"
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fetchAndEncode = async (
  url: string,
): Promise<{ base64: string; mimeType: string }> => {
  const response = await fetch(url);
  if (!response.ok) {
    const err = new Error(`Failed to fetch document from URL: ${response.statusText}`);
    Object.assign(err, { status: 502 });
    throw err;
  }
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const contentType = response.headers.get('content-type') || 'application/pdf';
  return { base64, mimeType: contentType.split(';')[0].trim() };
};

const parseServiceMap = (text: string): ServiceMap => {
  // Strip markdown fences if model returns them despite instructions
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as ServiceMap;
  } catch {
    const err = new Error(
      `AI returned unparseable output. Raw text: ${cleaned.slice(0, 200)}`,
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
};

export const clinicalExtractor = {
  /**
   * Fetches a PDF from a URL, sends it to Google Gemini for structured
   * data extraction, and returns a ServiceMap JSON.
   *
   * Falls back to Groq (text-only, lower accuracy) if Google fails.
   */
  extract: async (input: ExtractionInput): Promise<ServiceMap> => {
    const prompt = `Document type: ${input.docType}\n\n${EXTRACTION_PROMPT}`;

    try {
      // ── Primary: Google Gemini (native PDF support via inlineData) ──
      const { base64, mimeType } = await fetchAndEncode(input.fileUrl);

      const result = await aiService.generate({
        service: 'google',
        prompt,
        attachments: [
          {
            filename: input.filename,
            mimeType,
            dataBase64: base64,
          },
        ],
        options: { temperature: 0.1, maxTokens: 2048 },
      });

      return parseServiceMap(result.text);
    } catch (primaryError) {
      // ── Fallback: Groq (text-only — no PDF attachment support) ──
      console.warn(
        '[ClinicalExtractor] Primary (Google) failed — falling back to Groq:',
        primaryError,
      );

      const fallbackPrompt = `${prompt}

Note: The actual PDF could not be attached. Document filename: "${input.filename}".
Extract as much as you can from available context. Use null for all fields you cannot determine.`;

      const fallbackResult = await aiService.generate({
        service: 'groq',
        prompt: fallbackPrompt,
        options: { temperature: 0.1, maxTokens: 2048 },
      });

      return parseServiceMap(fallbackResult.text);
    }
  },
};
