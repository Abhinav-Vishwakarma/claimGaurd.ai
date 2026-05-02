# AI Pipeline Flow

ClaimGuard.ai processes medical insurance claims through a **4-stage multi-agent pipeline**. Each stage is an autonomous agent with a defined input, output, and set of AI tools it can invoke. The pipeline runs end-to-end in response to an admin triggering AI analysis on a claim.

---

## Pipeline Overview

```
Uploaded Documents
   (Prescription PDF + Bill PDF + Lab Report PDF)
             │
             ▼
  ┌─────────────────────┐
  │  Agent 1            │
  │  Clinical Extractor │  ← pdf-parse / Gemini Vision OCR / Groq text
  └────────┬────────────┘
           │  ServiceMap × 3 (prescription, bill, lab_report)
           ▼
  ┌─────────────────────┐
  │  Agent 2            │
  │  Clinical Validator │  ← Qdrant semantic search / Groq LLaMA3 fraud
  └────────┬────────────┘
           │  ClinicalValidationReport
           ▼
  ┌─────────────────────┐
  │  Agent 3            │
  │  Integrity          │  ← Prisma policy DB lookup / deterministic checks
  │  Gatekeeper         │
  └────────┬────────────┘
           │  GatekeeperReport
           ▼
  ┌─────────────────────┐
  │  Agent 4            │
  │  Financial          │  ← rules.json allowable amounts / cost-sharing math
  │  Adjudicator        │
  └────────┬────────────┘
           │  FinancialAdjudicationReport
           ▼
     Final Decision Stored in PostgreSQL
     (APPROVED / FLAGGED with risk score + breakdown)
```

---

## Stage 1 — Extraction (Agent 1: Clinical Extractor)

**Goal:** Convert raw uploaded documents into structured `ServiceMap` JSON objects.

### Input
- `fileUrl` — UploadThing CDN URL of the document
- `filename` — Original filename (used to detect document type)
- `docType` — One of `prescription`, `bill`, or `lab_report`

### Process

```
Is file a PDF or DOCX?
  → YES: Extract text locally using pdf-parse or mammoth
         Has embedded text (> 20 chars)?
           → YES: Send extracted text to Groq for structured JSON extraction
           → NO:  Fall back to Gemini Vision OCR (scanned document)
  → NO (image): Send to Gemini Vision OCR directly
```

**Fallback chain:** `pdf-parse → Groq text` → `Groq fails → Gemini text` → `Image → Gemini Vision` → `Vision fails → Groq text-only`

### Output

Each document becomes a `ServiceMap`:

```json
{
  "metadata": {
    "patient_id": "MBR-00123",
    "date_of_service": "2026-04-15",
    "provider_npi": "1234567890",
    "claim_type": "PPO"
  },
  "triangulation_data": {
    "prescription": {
      "ordered_service": "Chest X-Ray, Rapid Influenza Test",
      "reason": "Suspected Pneumonia, Viral etiology check",
      "signature_verified": true
    },
    "billing": {
      "cpt_codes": ["71045", "87804"],
      "billed_amount": 320.00
    },
    "lab_report": {
      "performed_service": "CPT 71045",
      "findings_summary": "No consolidation observed"
    }
  },
  "predictive_signals": {
    "risk_factors": ["smoker"],
    "comorbidities": [],
    "next_recommended_visit": "90 days"
  }
}
```

---

## Stage 2 — Judging (Agent 2: Clinical Validator)

**Goal:** Validate that the billed services are clinically appropriate and free of fraud.

### Input
- `prescription` ServiceMap
- `bill` ServiceMap

### 3-Phase Validation

#### Phase 1 — Semantic Condition Matching (Qdrant)

```
semanticQuery = "Suspected Pneumonia Chest X-Ray 71045 87804"
    → Google Embeddings → 768d vector
    → Qdrant cosine similarity search (top 5 results)
    → Top match: "Acute Respiratory Infection (Cough)" (score: 0.91)
    → Retrieved: allowed CPTs, non-billable ICD10 codes, fraud traps
```

#### Phase 2 — CPT Allowlist + ICD-10 Specificity

- Every billed CPT code is checked against the matched condition's allowlist
- Prescription text is scanned for non-billable ICD-10 category codes
- Unauthorized CPTs and non-billable ICD codes generate rejection reasons

#### Phase 3 — AI Fraud Detection (Groq LLaMA3)

The fraud detection prompt is assembled with:
- Matched condition name
- Billed CPT codes
- Condition-specific reasoning traps
- Clinical context (ordered service, reason)

The LLM returns a structured assessment of **upcoding** and **unbundling** risks.

### Output

```json
{
  "passed": true,
  "matched_condition": "Acute Respiratory Infection (Cough)",
  "qdrant_confidence": 0.91,
  "icd10_specificity": { "is_leaf_node": true, "non_billable_hit": false },
  "medical_necessity": { "passed": true, "unauthorized_cpts": [] },
  "fraud_detection": {
    "upcoding": { "type": "NONE", "severity": "NONE" },
    "unbundling": { "type": "NONE", "severity": "NONE" },
    "ai_reasoning": "Both billed CPTs are independently appropriate for the cough presentation..."
  },
  "rejection_reasons": []
}
```

---

## Stage 3 — Gatekeeping (Agent 3: Integrity Gatekeeper)

**Goal:** Enforce administrative compliance and cross-document data integrity.

### Input
- `prescription`, `bill`, `labReport` — all three ServiceMaps

### 3 Checks

| Check | What It Verifies |
|---|---|
| **Administrative** | Patient IDs match across all documents; Provider NPI present; Service dates in chronological order |
| **Policy Active** | Patient's member profile exists in the database; Policy is active; Premium is paid |
| **Triangulation** | Billed CPTs align with ordered services; Lab report confirms service was performed |

### Output

```json
{
  "is_clean_claim": true,
  "checks": {
    "administrative": { "passed": true },
    "policy_active": { "passed": true, "details": "Premium current" },
    "triangulation": { "passed": true, "cpt_mismatches": [], "missing_lab_report": false }
  },
  "rejection_reasons": [],
  "can_proceed_to_medical_review": true
}
```

---

## Stage 4 — Adjudication (Agent 4: Financial Adjudicator)

**Goal:** Calculate the exact payment amounts for approved claims using price scrubbing and cost-sharing.

### Input
- Total billed amount
- Billed CPT codes
- Matched condition (from Stage 2)
- Member policy terms (copay, coinsurance, coverage limit)

### 2-Step Calculation

#### Step A — Price Scrubbing

For each CPT code, load the `allowable_amount` from `rules.json`. If the billed amount exceeds the allowable, cap it.

```
Billed: $320 across 2 CPTs → $160/CPT
Allowable: 71045 = $150, 87804 = default $200
Total Allowable: $350
Approved = min(320, 350) = $320  → No scrubbing needed
```

#### Step B — Cost Sharing

```
Copay:              $20.00
Coinsurance:        20% × $320 = $64.00
Patient pays:       $84.00
Insurer pays:       $320 - $84 = $236.00
```

### Output

```json
{
  "totalBilledAmount": 320.00,
  "totalAllowableAmount": 350.00,
  "approvedAmount": 320.00,
  "scrubSavings": 0.00,
  "copay": 20.00,
  "coinsuranceRate": 0.20,
  "coinsuranceCharge": 64.00,
  "patientResponsibility": 84.00,
  "insurerPays": 236.00,
  "cptBreakdown": [
    { "cptCode": "71045", "billedAmount": 160.00, "allowableAmount": 150.00, "scrubSavings": 10.00 }
  ],
  "notes": ["Billed amount is within allowable limits"]
}
```

---

## Real-Time Agent Events

Throughout pipeline execution, each agent emits typed events streamed to the frontend:

| Event Type | Meaning |
|---|---|
| `AGENT_STARTED` | Agent has been activated |
| `AGENT_THINKING` | Agent is reasoning about an intermediate step |
| `TOOL_CALL` | Agent is invoking an external tool (Qdrant, Groq, Gemini) |
| `TOOL_RESULT` | Tool has returned a result |
| `AGENT_OUTPUT` | Agent has produced its final output |

These events power the **Live Agent Event Feed** visible in the admin claim review page.
