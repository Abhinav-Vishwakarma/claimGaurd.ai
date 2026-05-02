# Rules and Logic Schema

ClaimGuard.ai uses a **declarative rules schema** to encode medical billing compliance logic. These rules define what constitutes a valid claim for a given clinical condition, which ICD-10 codes are billable, which CPT procedures are allowed, and what fraud patterns the AI should watch for.

---

## Overview

Rather than hard-coding validation logic in application code, ClaimGuard.ai separates business rules into a standalone **`rules.json` file** — a portable, human-editable schema that can be updated without changing the codebase.

Each rule entry represents a **clinical condition** and contains:

- **Identity** — A human-readable condition name
- **ICD-10 mappings** — Billable leaf-node codes vs. non-billable category codes
- **CPT allowlist** — The set of procedures that are medically appropriate
- **Financials** — Cost-sharing parameters (copay, coinsurance)
- **Reasoning traps** — Fraud detection signals specific to this condition

---

## Schema Reference

### Top-Level Structure

```json
{
  "system_rules": {
    "specificity_rule": "ICD-10 codes must reach the highest level of detail (leaf nodes).",
    "injury_7th_character_rule": "Injury codes (e.g., S42) require a 7th character to be billable.",
    "triangulation_requirement": ["Rx_Ordered_List", "Billed_CPT", "Lab_Report_Verification"],
    "timely_filing_limit_days": 120
  },
  "conditions": [ ... ]
}
```

`system_rules` applies globally across all conditions and defines cross-cutting compliance requirements that must be satisfied for any claim.

### Condition Schema

```json
{
  "name": "Type 2 Diabetes",
  "icd10": {
    "non_billable": ["E11"],
    "billable": ["E11.9"]
  },
  "allowed_cpt_codes": [
    { "code": "83036", "description": "Hemoglobin A1c test", "allowable_amount": 80.00 },
    { "code": "82947", "description": "Glucose; quantitative, blood" },
    { "code": "99213", "description": "Standard mid-level office visit" }
  ],
  "financials": {
    "copay": 15.00,
    "coinsurance_percent": 0.10
  },
  "reasoning_traps": [
    "Upcoding: Flagging 99215 (Complex visit) for simple refills"
  ]
}
```

### Field Definitions

| Field | Type | Description |
|---|---|---|
| `name` | string | Human-readable condition name used for matching and display |
| `icd10.billable` | string[] | ICD-10 leaf codes that are valid for billing |
| `icd10.non_billable` | string[] | ICD-10 category codes that trigger a specificity rejection |
| `allowed_cpt_codes[].code` | string | CPT procedure code |
| `allowed_cpt_codes[].description` | string | Plain-language description of the procedure |
| `allowed_cpt_codes[].allowable_amount` | number? | Maximum payable amount for this CPT (used in price scrubbing) |
| `financials.copay` | number | Fixed patient copay in USD |
| `financials.coinsurance_percent` | number | Coinsurance rate as a decimal (0.20 = 20%) |
| `reasoning_traps` | string[] | Condition-specific fraud signals passed to the AI fraud detector |

---

## How Rules Are Evaluated

Rule evaluation happens in three distinct phases during claim processing:

### Phase 1 — Semantic Matching

The claim's clinical context is converted to a semantic query and matched against Qdrant. The highest-confidence matched condition becomes the active rule set for this claim.

```
Input: "Suspected Pneumonia, Chest X-Ray, CPT 71045"
       ↓ (Google Embeddings → Qdrant cosine similarity)
Output: Matched Condition = "Acute Respiratory Infection (Cough)", Score = 0.91
```

### Phase 2 — Deterministic Rule Checks

Once the condition is matched, deterministic logic applies the rules:

```
ICD-10 Specificity:  Is billed ICD in icd10.non_billable? → REJECT
CPT Allowlist:       Is billed CPT in allowed_cpt_codes?  → APPROVE / REJECT
```

### Phase 3 — AI-Augmented Fraud Detection

The `reasoning_traps` from the matched condition are passed to the **Groq LLaMA3 model** alongside the claim context. The AI uses self-questioning logic to assess:

- **Upcoding** — Was a higher complexity visit code billed than the clinical context justifies?
- **Unbundling** — Were separately billable components of a global procedure improperly split?

---

## Extensibility

The rules engine is designed to be **non-breaking and additive**. You can:

- **Add conditions** — New entries in `rules.json` become immediately available after re-indexing Qdrant.
- **Expand CPT allowlists** — Add new CPT codes to existing conditions without any code changes.
- **Update financial terms** — Adjust copay and coinsurance values per condition.
- **Enrich reasoning traps** — Add new fraud signals to improve LLM detection accuracy.

For complex programmatic rules that cannot be expressed in JSON (e.g., date-range logic, cross-document validation), the `integrity-gatekeeper.ts` agent provides a TypeScript-native rule evaluation layer that complements the JSON schema.
