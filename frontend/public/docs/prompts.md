# Prompts Used

ClaimGuard.ai uses carefully engineered prompts at multiple stages of the AI pipeline. Each prompt is designed to elicit **structured, deterministic JSON output** from the LLM — minimizing hallucination and maximizing auditability.

---

## Design Philosophy

### Why Structured Prompts?

Medical billing validation requires **verifiable, machine-parseable outputs**. Free-form AI responses are not useful here — the system needs to:

1. Extract specific fields from documents (patient ID, CPT codes, dates)
2. Return fraud assessments with defined severity levels
3. Produce outputs that downstream agents can consume programmatically

Structured prompts solve this by:
- **Defining an exact output schema** — the LLM is shown the JSON structure it must return
- **Providing explicit constraints** — "Return ONLY raw JSON, NO markdown, NO explanation"
- **Encoding domain rules inline** — the prompt carries the logic, not a separate config layer

### How Consistency is Maintained

- **Temperature is set to 0.0–0.1** for extraction tasks (zero randomness, maximum determinism)
- **`responseFormat: 'json_object'`** is passed to Groq where supported, enforcing JSON-only output
- **A JSON extractor** strips code fences and finds the first `{...}` block, making responses resilient to minor formatting deviations
- **Fallback logic** is always present — if the LLM returns unparseable output, a safe default is used

---

## Prompt 1 — Document Extraction (Agent 1)

Used to extract structured `ServiceMap` data from a medical document.

**Model:** Groq LLaMA3 (primary), Google Gemini (fallback)
**Temperature:** 0.0

```
You are a medical claim document intelligence engine.

Document type: {docType}
Source file: {filename}
Extraction method: LOCAL TEXT EXTRACTION (PDF/DOCX parsed server-side)

Extracted document text:
--- BEGIN DOCUMENT TEXT ---
{extractedText}
--- END DOCUMENT TEXT ---

STRICT RULES:
1. Return ONLY a raw JSON object - NO markdown, NO code fences, NO explanation text.
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
      "vitals": "<object or null>"
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
}
```

**Why this works:** The schema acts as a binding contract. The LLM understands it must populate specific fields with specific types — there is no ambiguity about what constitutes a valid response.

---

## Prompt 2 — Prescription Extraction (Agent 1, specialized)

A modified extraction prompt for prescription documents, with additional rules for the procedures table format.

**Key additions:**

```
CRITICAL EXTRACTION RULES FOR PRESCRIPTION DOCUMENTS:

1. Locate the procedures or tests ordered table in the document.
2. For "ordered_service": concatenate every value in the Description or Service column
   into one comma-separated string.
3. For "reason": concatenate every value in the Reason or Indication column
   into one comma-separated string.
4. For "ordered_cpts": extract every CPT code from the CPT Code column as an array.
5. NEVER return null for ordered_service or reason if a procedures table exists.
6. For "billed_amount" in billing section: prescriptions do not have billing amounts,
   set this to null intentionally.
7. For "signature_verified": set to true if a physician signature appears.
```

**Why this prompt exists separately:** Prescription documents have a structured table of ordered procedures that must be concatenated correctly — not summarized. This dedicated prompt prevents the LLM from collapsing multiple procedures into a single summarized string.

---

## Prompt 3 — Fraud Detection (Agent 2)

Used to assess upcoding and unbundling fraud patterns in the billed claim.

**Model:** Groq LLaMA3
**Temperature:** 0.1

```
You are an expert medical billing fraud investigator. Analyze the following claim for fraud patterns.

CONDITION: {conditionName}
ORDERED SERVICE (from prescription): {orderedService}
CLINICAL REASON: {reason}
BILLED CPT CODES: {billedCpts}
TOTAL BILLED AMOUNT: {billedAmount}
KNOWN FRAUD PATTERNS FOR THIS CONDITION: {reasoningTraps}

EXPLICIT UNBUNDLING RULES:
Do NOT flag unbundling if:
- CPT codes belong to different categories (e.g., evaluation, lab, imaging, therapy).
- No single comprehensive CPT exists that replaces them.
- Services are independently performed and medically necessary based on the condition.

SELF-QUESTIONING LOGIC:
Before formulating your final response, internally ask yourself:
1. Is ICD billable and specific?
2. Are all CPT codes allowed for this condition?
3. Do CPT codes match prescription + lab reports?
4. Are CPT codes independent or part of a bundle?
5. Is visit level justified?
6. Are tests medically necessary?
7. Is cost reasonable vs context?
8. Any mismatch or anomaly?

STRICT RULES:
1. Return ONLY a raw JSON object - NO markdown, NO code fences, NO explanation.
2. Analyze specifically for UPCODING and UNBUNDLING based on your self-questioning analysis.

Return exactly this JSON:
{
  "upcoding": {
    "type": "UPCODING or NONE",
    "description": "<one sentence explanation or 'No upcoding detected'>",
    "severity": "HIGH or MEDIUM or LOW or NONE"
  },
  "unbundling": {
    "type": "UNBUNDLING or NONE",
    "description": "<one sentence explanation or 'No unbundling detected'>",
    "severity": "HIGH or MEDIUM or LOW or NONE"
  },
  "ai_reasoning": "<step-by-step summary of self-questioning deductions>"
}
```

**Why self-questioning logic?** Medical fraud detection is nuanced — an AI model that states a conclusion without reasoning is a black box. By requiring the model to reason step-by-step internally before concluding, we get:
- More accurate assessments
- An auditable `ai_reasoning` field that a human reviewer can check
- Reduced false positives from overly eager fraud classification

---

## Prompt 4 — Vision OCR (Agent 1, fallback)

Used when a document cannot be text-extracted locally (scanned PDFs or images).

**Model:** Google Gemini Vision

```
You are a medical claim document intelligence engine.

Document type: {docType}

Your ONLY job is to extract structured data from the attached medical document image.

STRICT RULES:
1. Return ONLY a raw JSON object - NO markdown, NO code fences, NO explanation text.
2. Use null for any field you cannot find in the document.
3. Do NOT hallucinate or invent data. Only extract what is present.
4. cpt_codes must be an array of strings (can be empty []).
5. risk_factors and comorbidities must be arrays of strings (can be empty []).

Return exactly this JSON schema:
{ ... same schema as Prompt 1 ... }
```

The document image is attached as a base64-encoded file via the Gemini multimodal API. Gemini's vision capabilities allow it to read text from scanned documents, handwritten notes, and photographed forms.
