# Vector Database (Qdrant)

ClaimGuard.ai uses **Qdrant** as its vector database to power the semantic search layer of the AI pipeline. Qdrant enables the system to match incoming claim data against a clinical rules knowledge base using high-dimensional embeddings — far more effectively than keyword-based search.

---

## Why Qdrant?

Traditional rule engines rely on exact-match lookup: a billed CPT code either exists in an allowlist or it doesn't. This approach breaks down when:

- Clinical text uses natural language (e.g., "suspected pneumonia" vs. "acute lower respiratory infection")
- Documents use synonyms, abbreviations, or partial descriptions
- The claim context must be matched holistically, not field by field

**Qdrant solves this** by enabling **semantic similarity search** — the claim's clinical context is converted into a vector embedding, and Qdrant finds the closest-matching condition from the knowledge base in embedding space, regardless of exact wording.

---

## What Data is Stored

Qdrant stores **one vector point per clinical condition** defined in `rules.json`. Each point contains:

| Component | Description |
|---|---|
| **Vector** | 768-dimension embedding generated from the condition's clinical description |
| **Payload (metadata)** | Structured JSON: condition name, billable ICD-10 codes, CPT allowlist, fraud reasoning traps |
| **Point ID** | A stable UUID deterministically derived from the condition name (SHA-256 hash) — ensures idempotent re-indexing |

The **page content** embedded into the vector is a rich, natural-language representation:

```
Condition: Acute Respiratory Infection (Cough)
Billable ICD-10 codes: R05.9
Non-billable ICD-10 codes: R05
Allowed CPT codes:
  71045: Chest X-ray, single view, allowable amount $150.00
  87804: Rapid Influenza (Flu) test
  87636: Combined COVID-19 and Influenza A/B test
  94640: Nebulizer treatment
Patient financials: copay $20.00, coinsurance 0.2
Reasoning traps: Mismatch: Flagging Brain MRI (70551) for cough symptoms
```

---

## How Similarity Search Works

### Embedding

When a new claim is processed, the system constructs a semantic query from extracted fields:

```typescript
const semanticQuery = [prescriptionReason, orderedService, ...billedCpts]
  .filter(Boolean)
  .join(' ');
// → "Suspected Pneumonia Chest X-Ray 71045 87804"
```

This query is then embedded using **Google's `text-embedding-004` model**, producing a 768-dimension vector.

### Retrieval

The embedding is sent to Qdrant using cosine similarity search:

```typescript
const results = await vectorStore.similaritySearchWithScore(semanticQuery, 5);
// Returns top-5 matching conditions with confidence scores
```

Qdrant returns matches ranked by cosine similarity score. The **top result becomes the matched condition** for the claim.

### Score Interpretation

| Score Range | Interpretation |
|---|---|
| 0.90 – 1.00 | Strong match — high confidence in condition alignment |
| 0.75 – 0.90 | Moderate match — proceed with caution |
| < 0.75 | Weak match — rules fallback may be triggered |

---

## How it Integrates with the AI Pipeline

Qdrant operates at **Agent 2 (Clinical Validator)** in the pipeline:

```
Claim Documents
    ↓ Agent 1 (Extractor) — extracts clinical context
    ↓ Agent 2 (Validator) — builds semantic query from extracted data
         ↓ Google Embeddings — vectorize query
         ↓ Qdrant Search — retrieve top-N matching conditions
         ↓ Match payload — get allowed CPTs, ICD codes, fraud traps
    ↓ Agent 3 (Gatekeeper) — administrative + policy checks
    ↓ Agent 4 (Adjudicator) — financial calculation
```

The metadata returned from Qdrant drives:
- **ICD-10 specificity validation** — comparing non_billable list against prescription
- **CPT allowlist enforcement** — comparing billed CPTs to retrieved allowed CPTs
- **Fraud analysis prompt enrichment** — passing reasoning_traps to Groq LLM

---

## Example End-to-End Flow

```
1. Prescription extracted: reason = "Suspected Pneumonia", service = "Chest X-Ray"
2. Bill extracted: CPT codes = ["71045", "87804"], billed amount = $320

3. Semantic query built:
   "Suspected Pneumonia Chest X-Ray 71045 87804"

4. Google Embeddings → 768d vector

5. Qdrant search → Top result:
   {
     condition: "Acute Respiratory Infection (Cough)",
     score: 0.91,
     allowed_cpts: ["71045", "87804", "87880", "87636", "94640", "99202", "99215"],
     non_billable_icd10: ["R05"]
   }

6. CPT check: 71045 ✅ allowed, 87804 ✅ allowed → Medical necessity PASSED

7. ICD specificity: prescription does not reference "R05" → PASSED

8. Fraud prompt enriched with reasoning trap:
   "Mismatch: Flagging Brain MRI (70551) for cough symptoms"
   → AI concludes: no upcoding, no unbundling detected
```

---

## Connection Configuration

Qdrant is configured via environment variables:

```env
QDRANT_URL=https://your-cluster.cloud.qdrant.io
QDRANT_API_KEY=your_api_key
QDRANT_COLLECTION_NAME=claim_rules
```

The collection is created automatically when you run `npm run rag:index-rules`.
