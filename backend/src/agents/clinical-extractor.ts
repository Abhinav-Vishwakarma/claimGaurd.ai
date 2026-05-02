import { aiService } from '../api/ai/ai.service';
import type { ServiceMap } from '../api/ocr/ocr.types';
import { detectFileCategory, parseDocumentLocally } from '../utils/document-parser';
import type { AgentSession } from '../utils/agent-session';
import {
  PipelineAuditLogger,
  buildCriticalNullIssues,
  buildServiceMapFieldAudit,
} from '../utils/pipeline-audit';

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
1. Return ONLY a raw JSON object - NO markdown, NO code fences, NO explanation text.
2. Use null for any field you cannot find in the document.
3. Do NOT hallucinate or invent data. Only extract what is present.
4. cpt_codes must be an array of strings (can be empty []).
5. risk_factors and comorbidities must be arrays of strings (can be empty []).`;

const buildTextExtractionPrompt = (
  docType: string,
  extractedText: string,
  filename: string,
): string => `You are a medical claim document intelligence engine.

Document type: ${docType}
Source file: ${filename}
Extraction method: LOCAL TEXT EXTRACTION (PDF/DOCX parsed server-side - no OCR required)

Extracted document text:
--- BEGIN DOCUMENT TEXT ---
${extractedText.slice(0, 12000)}${extractedText.length > 12000 ? '\n[... truncated for length ...]' : ''}
--- END DOCUMENT TEXT ---

${RULES}

Return exactly this JSON schema:
${BASE_SCHEMA}`;

const buildVisionPrompt = (docType: string): string =>
  `You are a medical claim document intelligence engine.

Document type: ${docType}

Your ONLY job is to extract structured data from the attached medical document image.

${RULES}

Return exactly this JSON schema:
${BASE_SCHEMA}`;

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
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned) as ServiceMap;
  } catch {
    const err = new Error(`AI returned unparseable output. Raw: ${cleaned.slice(0, 200)}`);
    Object.assign(err, { status: 422 });
    throw err;
  }
};

export type ExtractionInput = {
  fileUrl: string;
  filename: string;
  docType: 'prescription' | 'bill' | 'lab_report';
  session?: AgentSession;
  auditLogger?: PipelineAuditLogger;
};

const auditExtractionResult = (input: {
  auditLogger?: PipelineAuditLogger;
  docType: ExtractionInput['docType'];
  filename: string;
  llmService: 'groq' | 'google';
  prompt: string;
  rawResponseText: string;
  parsedServiceMap: ServiceMap;
  rawExtractedText?: string | null;
  extractionMethod: string;
  issues?: Array<{ code: string; message: string }>;
}) => {
  const {
    auditLogger,
    docType,
    filename,
    llmService,
    prompt,
    rawResponseText,
    parsedServiceMap,
    rawExtractedText,
    extractionMethod,
    issues = [],
  } = input;

  if (!auditLogger) return;

  const { fieldAudit, dataCompletenessScore } = buildServiceMapFieldAudit(parsedServiceMap);
  const criticalIssues = buildCriticalNullIssues(parsedServiceMap, rawExtractedText);

  auditLogger.addPhase({
    phase: `agent_1_extraction_${docType}`,
    agent: 'agent_1',
    status: criticalIssues.length > 0 || issues.length > 0 ? 'warn' : 'ok',
    input_snapshot: {
      filename,
      doc_type: docType,
      llm_service: llmService,
      extraction_method: extractionMethod,
      raw_extracted_text: rawExtractedText ?? null,
      raw_prompt: prompt,
    },
    output_snapshot: {
      raw_llm_response_text: rawResponseText,
      parsed_service_map: parsedServiceMap,
      data_completeness_score: dataCompletenessScore,
    },
    field_audit: fieldAudit,
    issues: [...criticalIssues, ...issues],
  });
};

export const clinicalExtractor = {
  extract: async (input: ExtractionInput): Promise<ServiceMap> => {
    const { fileUrl, filename, docType, session, auditLogger } = input;
    const { buffer, mimeType } = await fetchBuffer(fileUrl);
    const fileCategory = detectFileCategory(filename, mimeType);

    if (fileCategory === 'pdf' || fileCategory === 'docx') {
      const methodLabel = fileCategory === 'pdf' ? 'pdf-parse' : 'mammoth (DOCX)';

      session?.emit({
        agent: 'agent_1',
        type: 'TOOL_CALL',
        tool: `local_${fileCategory}_parser`,
        message: `${filename} is a ${fileCategory.toUpperCase()} - extracting text locally via ${methodLabel}`,
      });

      let parsed;
      try {
        parsed = await parseDocumentLocally(buffer, fileCategory);
      } catch (parseErr) {
        session?.emit({
          agent: 'agent_1',
          type: 'TOOL_RESULT',
          tool: `local_${fileCategory}_parser`,
          message: `Local parsing failed: ${(parseErr as Error).message} - falling back to LLM vision`,
        });
        return clinicalExtractor.extract({ ...input, session: undefined, auditLogger });
      }

      session?.emit({
        agent: 'agent_1',
        type: 'TOOL_RESULT',
        tool: `local_${fileCategory}_parser`,
        message: `Local extraction complete - ${parsed.charCount.toLocaleString()} characters${parsed.pageCount ? `, ${parsed.pageCount} pages` : ''} extracted`,
      });

      if (!parsed.text || parsed.text.length < 20) {
        session?.emit({
          agent: 'agent_1',
          type: 'AGENT_THINKING',
          message: `No embedded text found in ${filename} - switching to Gemini Vision OCR`,
        });

        session?.emit({
          agent: 'agent_1',
          type: 'TOOL_CALL',
          tool: 'gemini_vision',
          message: 'Falling back: sending scanned PDF as image to Gemini Vision...',
        });

        return clinicalExtractor._extractViaGeminiVision({
          buffer,
          mimeType: 'application/pdf',
          filename,
          docType,
          session,
          auditLogger,
        });
      }

      session?.emit({
        agent: 'agent_1',
        type: 'TOOL_CALL',
        tool: 'groq_text_parser',
        message: `Sending ${parsed.charCount.toLocaleString()} chars of extracted text to Groq for structured JSON extraction...`,
      });

      const prompt = buildTextExtractionPrompt(docType, parsed.text, filename);

      try {
        const result = await aiService.generate({
          service: 'groq',
          prompt,
          options: { temperature: 0.0, maxTokens: 2048 },
          audit: {
            logger: auditLogger,
            phase: `agent_1_llm_${docType}`,
            agent: 'agent_1',
            inputSnapshot: {
              filename,
              doc_type: docType,
              extraction_method: methodLabel,
            },
          },
        });

        const serviceMap = parseServiceMap(result.text);
        auditExtractionResult({
          auditLogger,
          docType,
          filename,
          llmService: 'groq',
          prompt,
          rawResponseText: result.text,
          parsedServiceMap: serviceMap,
          rawExtractedText: parsed.text,
          extractionMethod: methodLabel,
        });

        session?.emit({
          agent: 'agent_1',
          type: 'TOOL_RESULT',
          tool: 'groq_text_parser',
          message: `Structured extraction complete via Groq - patient: ${serviceMap.metadata.patient_id ?? 'unknown'}, CPTs: [${serviceMap.triangulation_data.billing.cpt_codes.join(', ') || 'none detected'}]`,
        });

        return serviceMap;
      } catch (groqErr) {
        session?.emit({
          agent: 'agent_1',
          type: 'AGENT_THINKING',
          message: 'Groq parsing failed, retrying with Gemini text mode...',
        });

        const geminiTextResult = await aiService.generate({
          service: 'google',
          prompt,
          options: { temperature: 0.0, maxTokens: 2048 },
          audit: {
            logger: auditLogger,
            phase: `agent_1_llm_${docType}`,
            agent: 'agent_1',
            inputSnapshot: {
              filename,
              doc_type: docType,
              extraction_method: `${methodLabel} -> Gemini text fallback`,
            },
            issues: [{ code: 'GROQ_FALLBACK', message: (groqErr as Error).message }],
          },
        });

        const fallbackMap = parseServiceMap(geminiTextResult.text);
        auditExtractionResult({
          auditLogger,
          docType,
          filename,
          llmService: 'google',
          prompt,
          rawResponseText: geminiTextResult.text,
          parsedServiceMap: fallbackMap,
          rawExtractedText: parsed.text,
          extractionMethod: `${methodLabel} -> Gemini text fallback`,
          issues: [{ code: 'GROQ_FALLBACK', message: (groqErr as Error).message }],
        });

        return fallbackMap;
      }
    }

    session?.emit({
      agent: 'agent_1',
      type: 'TOOL_CALL',
      tool: 'gemini_vision',
      message: `${filename} is an image (${mimeType}) - sending to Google Gemini Vision for OCR extraction...`,
    });

    const serviceMap = await clinicalExtractor._extractViaGeminiVision({
      buffer,
      mimeType,
      filename,
      docType,
      session,
      auditLogger,
    });

    session?.emit({
      agent: 'agent_1',
      type: 'TOOL_RESULT',
      tool: 'gemini_vision',
      message: `Vision OCR complete - patient: ${serviceMap.metadata.patient_id ?? 'unknown'}, CPTs: [${serviceMap.triangulation_data.billing.cpt_codes.join(', ') || 'none detected'}]`,
    });

    return serviceMap;
  },

  _extractViaGeminiVision: async (input: {
    buffer: Buffer;
    mimeType: string;
    filename: string;
    docType: string;
    session?: AgentSession;
    auditLogger?: PipelineAuditLogger;
  }): Promise<ServiceMap> => {
    const { buffer, mimeType, filename, docType, auditLogger } = input;
    const base64 = buffer.toString('base64');
    const prompt = buildVisionPrompt(docType);

    try {
      const result = await aiService.generate({
        service: 'google',
        prompt,
        attachments: [{ filename, mimeType, dataBase64: base64 }],
        options: { temperature: 0.1, maxTokens: 2048 },
        audit: {
          logger: auditLogger,
          phase: `agent_1_llm_${docType}`,
          agent: 'agent_1',
          inputSnapshot: {
            filename,
            doc_type: docType,
            extraction_method: 'Gemini Vision OCR',
          },
        },
      });

      const serviceMap = parseServiceMap(result.text);
      auditExtractionResult({
        auditLogger,
        docType: docType as ExtractionInput['docType'],
        filename,
        llmService: 'google',
        prompt,
        rawResponseText: result.text,
        parsedServiceMap: serviceMap,
        rawExtractedText: null,
        extractionMethod: 'Gemini Vision OCR',
      });

      return serviceMap;
    } catch (googleErr) {
      console.warn('[ClinicalExtractor] Gemini Vision failed - falling back to Groq text-only:', googleErr);
      const fallbackPrompt = `${buildVisionPrompt(docType)}\n\nNote: Image could not be attached. Filename: "${filename}". Extract what you can; use null for all unknown fields.`;
      const fallback = await aiService.generate({
        service: 'groq',
        prompt: fallbackPrompt,
        options: { temperature: 0.1, maxTokens: 2048 },
        audit: {
          logger: auditLogger,
          phase: `agent_1_llm_${docType}`,
          agent: 'agent_1',
          inputSnapshot: {
            filename,
            doc_type: docType,
            extraction_method: 'Gemini Vision -> Groq text fallback',
          },
          issues: [{ code: 'VISION_FALLBACK', message: (googleErr as Error).message }],
        },
      });

      const fallbackMap = parseServiceMap(fallback.text);
      auditExtractionResult({
        auditLogger,
        docType: docType as ExtractionInput['docType'],
        filename,
        llmService: 'groq',
        prompt: fallbackPrompt,
        rawResponseText: fallback.text,
        parsedServiceMap: fallbackMap,
        rawExtractedText: null,
        extractionMethod: 'Gemini Vision -> Groq text fallback',
        issues: [{ code: 'VISION_FALLBACK', message: (googleErr as Error).message }],
      });

      return fallbackMap;
    }
  },
};
