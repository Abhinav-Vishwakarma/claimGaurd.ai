# The Knowledge Base

The knowledge base is the clinical intelligence core of ClaimGuard.ai. It contains structured medical rules, ICD-10 coding policies, CPT code allowlists, and billing compliance patterns — all organized so they can be efficiently retrieved at claim-review time.

---

## What the Knowledge Base Contains

The knowledge base is a curated collection of **medical billing conditions and their associated rules**, authored as a JSON schema (`src/data/rules.json`) and embedded into the **Qdrant vector database** for semantic search.

Each entry covers:

| Field | Description |
|---|---|
| `name` | Human-readable condition name (e.g., "Type 2 Diabetes") |
| `icd10.billable` | ICD-10 codes that are valid for billing (leaf nodes) |
| `icd10.non_billable` | Category codes that are NOT billable and will trigger rejection |
| `allowed_cpt_codes` | List of CPT procedure codes that are medically appropriate for the condition |
| `financials` | Copay and coinsurance rates tied to the condition |
| `reasoning_traps` | Known fraud patterns for this condition (upcoding, unbundling cues) |

---

## How Data is Structured

Below is an example condition entry from `rules.json`:

```json
{
  "name": "Acute Respiratory Infection (Cough)",
  "icd10": {
    "non_billable": ["R05"],
    "billable": ["R05.9"]
  },
  "allowed_cpt_codes": [
    { "code": "71045", "description": "Chest X-ray, single view", "allowable_amount": 150.00 },
    { "code": "87804", "description": "Rapid Influenza (Flu) test" },
    { "code": "87636", "description": "Combined COVID-19 and Influenza A/B test" },
    { "code": "94640", "description": "Nebulizer treatment" },
    { "code": "99202", "description": "Office visit, new patient" }
  ],
  "financials": {
    "copay": 20.00,
    "coinsurance_percent": 0.20
  },
  "reasoning_traps": [
    "Mismatch: Flagging Brain MRI (70551) for cough symptoms"
  ]
}
```

---

## How Data is Retrieved

ClaimGuard.ai uses **two-tier retrieval** for maximum resilience:

### Tier 1 — Semantic Search via Qdrant (Primary)

When a claim arrives, the system builds a **semantic query** from the prescription's clinical reason and ordered service:

```
"Suspected Pneumonia Chest X-Ray 71045 87804"
```

This query is embedded via **Google's text-embedding model** and used to perform a cosine similarity search against Qdrant. The top-scored condition is selected as the matched condition for that claim.

### Tier 2 — Deterministic Fallback via rules.json (Secondary)

If Qdrant is unavailable or returns no results, the system falls back to a direct JSON scan — matching billed CPT codes against the `allowed_cpt_codes` lists in `rules.json`.

```
rules.json → find condition where allowed_cpt_codes contains billed CPT → use as match
```

This ensures the pipeline never fails silently due to infrastructure issues.

---

## Role in Decision-Making

The knowledge base is consulted at **three critical points** in the pipeline:

1. **ICD-10 Specificity Check** — Verifies that the patient's diagnosis uses a billable leaf-node code, not a non-billable category code.

2. **CPT Allowlist Validation** — Confirms that every CPT code on the bill is clinically appropriate for the matched condition. Unauthorized CPTs trigger rejection.

3. **Fraud Reasoning Traps** — Provides condition-specific fraud cues (e.g., "Upcoding: Complex visit billed for a simple refill") that are passed to the AI fraud detection model to guide its analysis.

---

## Extending the Knowledge Base

To add new conditions:

1. Open `backend/src/data/rules.json`
2. Add a new object to the `conditions` array following the schema above
3. Re-run the indexing script to embed the new condition into Qdrant:

```bash
npm run rag:index-rules
```

The system will use a **stable UUID** derived from the condition name as the Qdrant point ID, ensuring idempotent re-indexing without creating duplicates.
