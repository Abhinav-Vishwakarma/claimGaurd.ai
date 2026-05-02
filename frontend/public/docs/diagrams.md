# System Diagrams

Visual representations of ClaimGuard.ai's architecture and data flow.

---

## MVP Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser / Client                         │
│           React 18 + Vite + TailwindCSS                     │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API + JWT
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Node.js + Express Backend                  │
│                                                             │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Auth   │  │   Claims   │  │   Admin  │  │  Health  │ │
│  │  Routes  │  │   Routes   │  │  Routes  │  │  Check   │ │
│  └──────────┘  └─────┬──────┘  └──────────┘  └──────────┘ │
│                      │                                      │
│          ┌───────────▼──────────────────────┐              │
│          │       4-Agent AI Pipeline         │              │
│          │                                  │              │
│          │  [1] Clinical Extractor           │              │
│          │      ↓ ServiceMap × 3             │              │
│          │  [2] Clinical Validator           │              │
│          │      ↓ ValidationReport           │              │
│          │  [3] Integrity Gatekeeper         │              │
│          │      ↓ GatekeeperReport           │              │
│          │  [4] Financial Adjudicator        │              │
│          │      ↓ AdjudicationReport         │              │
│          └──────────────────────────────────┘              │
└──────┬──────────────────────────┬───────────────┬──────────┘
       │                          │               │
       ▼                          ▼               ▼
┌────────────┐         ┌──────────────┐  ┌──────────────────┐
│ PostgreSQL │         │    Qdrant    │  │  External APIs   │
│ (Prisma)   │         │ Vector Store │  │                  │
│            │         │              │  │  Google Gemini   │
│ - Users    │         │ - Condition  │  │  (OCR + Embed)   │
│ - Claims   │         │   Embeddings │  │                  │
│ - Members  │         │ - CPT Rules  │  │  Groq LLaMA3     │
│ - Payments │         │ - Fraud Cues │  │  (Fraud LLM)     │
└────────────┘         └──────────────┘  │                  │
                                         │  UploadThing     │
                                         │  (File Storage)  │
┌────────────┐                           └──────────────────┘
│   Redis    │
│  (BullMQ)  │
│            │
│ - Job Q    │
│ - Sessions │
└────────────┘
```

---

## AI Pipeline Flow Diagram

```
Uploaded Documents
(prescription.pdf + bill.pdf + lab_report.pdf)
              │
              ▼
┌─────────────────────────────────────────┐
│  AGENT 1: Clinical Extractor            │
│                                         │
│  pdf-parse / mammoth (local text)       │
│     → Groq text extraction              │
│  OR Google Gemini Vision (scanned)      │
│                                         │
│  Output: 3× ServiceMap JSON             │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  AGENT 2: Clinical Validator            │
│                                         │
│  Phase 1: Semantic Qdrant search        │
│    prescription reason + CPTs           │
│    → Google Embeddings → vector         │
│    → Qdrant cosine similarity           │
│    → Matched condition + rules          │
│                                         │
│  Phase 2: Deterministic rule checks     │
│    ICD-10 specificity (leaf node)       │
│    CPT allowlist enforcement            │
│                                         │
│  Phase 3: Groq LLaMA3 fraud analysis   │
│    Upcoding? Unbundling?                │
│    Self-questioning chain of thought    │
│                                         │
│  Output: ClinicalValidationReport       │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  AGENT 3: Integrity Gatekeeper          │
│                                         │
│  Administrative check                   │
│    Patient ID match across docs         │
│    Provider NPI present                 │
│    Chronological date order             │
│                                         │
│  Policy check (Prisma DB)              │
│    Member profile exists                │
│    Policy active + premium paid         │
│                                         │
│  Triangulation check                    │
│    Billed CPTs ⟷ Ordered services     │
│    Lab report confirms service          │
│                                         │
│  Output: GatekeeperReport               │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  AGENT 4: Financial Adjudicator         │
│                                         │
│  Step A: Price Scrubbing                │
│    Load allowable amounts (rules.json)  │
│    Cap billed amount at allowable       │
│                                         │
│  Step B: Cost Sharing                   │
│    Copay (from policy / condition)      │
│    Coinsurance (rate × approved)        │
│    Patient vs Insurer split             │
│                                         │
│  Output: FinancialAdjudicationReport    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │  Final Result   │
         │  Stored in DB   │
         │                 │
         │  APPROVED ✅    │
         │  FLAGGED ⚠️    │
         │  REJECTED ❌    │
         └─────────────────┘
```

---

## Data Model Diagram

```
User
├── id (UUID)
├── email
├── name
├── role: CLIENT | ADMIN | HOSPITAL
└── claims[] → Claim

Claim
├── id (UUID)
├── status: PENDING | UNDER_REVIEW | APPROVED | REJECTED | FLAGGED
├── prescriptionUrl
├── billUrl
├── labReportUrl
├── aiAnalysisResult (JSON blob — all 4 agent outputs)
├── adminDecision (JSON — decision + remarks + timestamp)
├── createdAt / updatedAt
└── paymentRequests[] → PaymentRequest

MemberProfile
├── memberId (e.g., "MBR-00123")
├── policyActive (bool)
├── premiumPaid (bool)
├── planType: PPO | HMO | Medicare | Medicaid
├── copay
├── coinsuranceRate
└── coverageLimit

PaymentRequest
├── id (UUID)
├── claimId → Claim
├── amount
├── status: PENDING | PROCESSED | REJECTED
└── processedAt
```

---

## Product Architecture

*To be added later.*
