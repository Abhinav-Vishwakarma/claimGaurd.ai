<div align="center">

<img src="frontend/public/favicon.svg" alt="ClaimGuard.ai Logo" width="80" />

# ClaimGuard.ai

### AI-Powered Medical Insurance Claim Adjudication Platform

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-DC143C?style=flat-square)](https://qdrant.tech)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)

**ClaimGuard.ai** automates the end-to-end review of medical insurance claims using a multi-agent AI pipeline — extracting data from uploaded documents, validating clinical codes, detecting billing fraud, and calculating payment amounts — all in real time.

[**Live Demo**](https://claimguard-ai.vercel.app) · [**Project Demo Video**](https://drive.google.com/file/d/1sV07g-pReb3Gwzoa8Oi0bnImebAGM8Nm/view?usp=sharing) · [**Documentation**](https://claim-gaurd-ai.vercel.app/docs/installations)

</div>

---

## 🧪 Demo / Testing Credentials

You can use the following credentials to test the platform:

**Admin Role**
- Email: `admin@claimguard.com`
- Password: `123456789`

**Client Roles**
- Email: `rohan@gmail.com`
- Password: `12345678`
- Email: `suresh@gmail.com`
- Password: `12345678`

**Test Documents**
Sample test documents (PDF, DOCX, images) for uploading and processing can be found in the `Test_Docs/` folder in the root directory.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📄 **Multi-format Document Extraction** | Extracts structured clinical data from PDF, DOCX, and scanned image documents using pdf-parse, mammoth, and Gemini Vision OCR |
| 🧠 **4-Agent AI Pipeline** | Sequential agents for extraction → clinical validation → compliance gatekeeping → financial adjudication |
| 🔍 **Semantic Vector Search** | Qdrant vector store matches claim context to the nearest clinical condition using Google embeddings — no keyword dependency |
| 🚨 **Fraud Detection** | Groq LLaMA3 analyzes claims for upcoding and unbundling patterns using a self-questioning chain-of-thought approach |
| 📏 **Declarative Rules Engine** | JSON-based condition schema with ICD-10 codes, CPT allowlists, and fraud reasoning traps — extensible without code changes |
| 💰 **Financial Adjudication** | Automated price scrubbing and cost-sharing calculation per member policy terms |
| 👥 **Role-Based Access** | Client, Admin, and Hospital roles with JWT authentication and per-role dashboards |
| 📡 **Live Agent Event Feed** | Real-time streaming of pipeline events to the admin UI as agents execute |

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│              React 18 + Vite + TailwindCSS (Frontend)        │
└─────────────────────────┬────────────────────────────────────┘
                          │  REST API + JWT Bearer Token
                          ▼
┌──────────────────────────────────────────────────────────────┐
│          Node.js + Express 5 + TypeScript (Backend)          │
│                                                              │
│   Auth  │  Claims  │  Admin  │  Dashboard  │  Health        │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              4-Agent AI Pipeline                    │    │
│  │  [1] Clinical Extractor  →  ServiceMap × 3          │    │
│  │  [2] Clinical Validator  →  ValidationReport        │    │
│  │  [3] Integrity Gatekeeper → GatekeeperReport        │    │
│  │  [4] Financial Adjudicator → AdjudicationReport     │    │
│  └─────────────────────────────────────────────────────┘    │
└────────┬──────────────────────┬────────────────┬────────────┘
         │                      │                │
         ▼                      ▼                ▼
  ┌─────────────┐     ┌──────────────┐   ┌──────────────────┐
  │ PostgreSQL  │     │    Qdrant    │   │  Google Gemini   │
  │  (Prisma)   │     │ Vector Store │   │  Groq LLaMA3     │
  │             │     │              │   │  UploadThing     │
  │  Users      │     │  Condition   │   └──────────────────┘
  │  Claims     │     │  Embeddings  │
  │  Members    │     │  CPT Rules   │   ┌──────────────────┐
  │  Payments   │     └──────────────┘   │  Redis (BullMQ)  │
  └─────────────┘                        │  Job Queues      │
                                         └──────────────────┘
```

---

## 🔄 AI Pipeline Flow

A claim passes through **4 sequential agents**, each with a defined responsibility:

```
Uploaded Documents (PDF / DOCX / Image)
         │
         ▼
 ┌─────────────────────┐
 │  Agent 1            │   pdf-parse · mammoth · Gemini Vision OCR · Groq
 │  Clinical Extractor │ ──────────────────────────────────────────────────►
 └─────────────────────┘   Output: 3 × ServiceMap JSON
         │
         ▼
 ┌─────────────────────┐
 │  Agent 2            │   Qdrant semantic search · Groq LLaMA3 fraud LLM
 │  Clinical Validator │ ──────────────────────────────────────────────────►
 └─────────────────────┘   Output: ICD-10 check · CPT allowlist · fraud flags
         │
         ▼
 ┌─────────────────────┐
 │  Agent 3            │   Prisma DB · deterministic rule checks
 │  Integrity          │ ──────────────────────────────────────────────────►
 │  Gatekeeper         │   Output: admin check · policy check · triangulation
 └─────────────────────┘
         │
         ▼
 ┌─────────────────────┐
 │  Agent 4            │   rules.json allowables · cost-sharing math
 │  Financial          │ ──────────────────────────────────────────────────►
 │  Adjudicator        │   Output: insurer pays · patient responsibility
 └─────────────────────┘
         │
         ▼
  APPROVED ✅  /  FLAGGED ⚠️  /  REJECTED ❌
```

## Data Flow Diagram

![Alt text](./frontend/public/diagrams/dfd.png)

---

## 🛠️ Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| Language | TypeScript 5 |
| ORM | Prisma 7 |
| Database | PostgreSQL 15 |
| Queue | BullMQ + Redis |
| Auth | JWT (access + refresh tokens) |
| Validation | Zod |
| File Storage | UploadThing |

### AI & Data
| Component | Technology |
|---|---|
| Vector DB | Qdrant (cloud) |
| Embeddings | Google `text-embedding-004` |
| OCR / Vision | Google Gemini Vision |
| Fraud LLM | Groq LLaMA3 (70B) |
| LLM Orchestration | LangChain (`@langchain/core`, `@langchain/qdrant`) |
| PDF Extraction | pdf-parse, mammoth |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 |
| Bundler | Vite 5 |
| Styling | TailwindCSS |
| Routing | Custom `usePath` hook (no React Router) |
| Markdown | react-markdown |

---

## 📁 Project Structure

```
claimguard-ai/
├── backend/
│   ├── src/
│   │   ├── agents/              # 4-agent AI pipeline
│   │   │   ├── clinical-extractor.ts
│   │   │   ├── clinical-validator.ts
│   │   │   ├── integrity-gatekeeper.ts
│   │   │   └── financial-adjudicator.ts
│   │   ├── api/                 # Express route handlers
│   │   │   ├── auth/
│   │   │   ├── claims/
│   │   │   ├── admin/
│   │   │   └── dashboard/
│   │   ├── config/              # Prisma, Qdrant, Redis, embeddings
│   │   ├── data/
│   │   │   └── rules.json       # Clinical condition rules + CPT allowlists
│   │   ├── middlewares/         # JWT auth, Zod validation
│   │   ├── rag/                 # LangChain document builders
│   │   ├── scripts/             # Qdrant indexing CLI
│   │   ├── tools/               # rule-engine (Qdrant search wrapper)
│   │   └── utils/               # agent-session, pipeline-audit, doc-parser
│   ├── prisma/
│   │   └── schema.prisma
│   └── tests/
│
└── frontend/
    ├── public/
    │   └── docs/                # Markdown documentation files
    └── src/
        ├── app/                 # App root + routing
        ├── features/            # Domain-driven feature modules
        │   ├── auth/
        │   ├── dashboard/
        │   │   ├── admin/
        │   │   ├── client/
        │   │   └── hospital/
        │   ├── docs/            # Documentation viewer
        │   └── landing/
        ├── components/          # Shared UI components
        ├── hooks/               # useLanguage, useTheme, usePath
        └── lib/                 # apiService, authService
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18
- **PostgreSQL** >= 15
- **Qdrant** (cloud account or local Docker)
- **Redis** >= 7
- API keys for **Google Gemini** and **Groq**

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/claimguard-ai.git
cd claimguard-ai
```

### 2. Start Infrastructure (Docker)

```bash
cd backend
docker compose up -d   # starts PostgreSQL, Redis, Qdrant locally
```

### 3. Backend Setup

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# → Fill in DATABASE_URL, GEMINI_API_KEY, GROQ_API_KEY, QDRANT_URL, etc.

# Apply database schema
npm run prisma:generate
npm run prisma:migrate

# Embed rules into Qdrant vector store
npm run rag:index-rules

# Start development server
npm run dev
# → http://localhost:5000
```

### 4. Frontend Setup

```bash
cd ../frontend
npm install

# Configure environment
echo "VITE_API_URL=http://localhost:5000/api/v1" > .env

# Start development server
npm run dev
# → http://localhost:5173
```

### 5. Verify

```bash
curl http://localhost:5000/api/v1/health
# → { "status": "ok", "services": { "database": "connected", "redis": "connected" } }
```

---

## ⚙️ Environment Variables

### Backend (`.env`)

```env
# Application
NODE_ENV=development
PORT=5000

# PostgreSQL (via Prisma)
DATABASE_URL="postgresql://user:password@localhost:5432/claimguard"

# JWT Secrets
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis (for BullMQ queues)
REDIS_HOST=localhost
REDIS_PORT=6379

# Qdrant (Vector DB)
QDRANT_URL=https://your-qdrant-cluster.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=claim_rules

# Google Gemini (Extraction + Vision OCR)
GEMINI_API_KEY=your_google_gemini_api_key
GOOGLE_EMBEDDING_MODEL=gemini-embedding-001

# Groq (Fraud Detection LLM)
GROQ_API_KEY=your_groq_api_key
GROQ_DEFAULT_MODEL=llama-3.3-70b-versatile

# UploadThing (File Storage)
UPLOADTHING_TOKEN=your_uploadthing_token
UPLOADTHING_SECRET=your_uploadthing_secret
UPLOADTHING_APP_ID=your_uploadthing_app_id
```

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:5000/api/v1
```

---

## 📋 Available Scripts

### Backend

```bash
npm run dev              # Start dev server with hot reload
npm run build            # Compile TypeScript to dist/
npm run start            # Run compiled production build
npm test                 # Run Jest test suite
npm run test:watch       # Jest in watch mode
npm run rag:index-rules  # Embed rules.json into Qdrant
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run Prisma migrations
npm run prisma:studio    # Open Prisma Studio (DB GUI)
```

### Frontend

```bash
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build locally
```

---

## 🔐 API Reference

### Authentication

All protected routes require:
```
Authorization: Bearer <access_token>
```

### Core Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create account |
| `POST` | `/api/auth/login` | Public | Login and receive tokens |
| `POST` | `/api/auth/refresh` | Public | Refresh access token |
| `GET` | `/api/auth/me` | Required | Get current user |
| `POST` | `/api/claims` | Required | File a new claim |
| `GET` | `/api/claims` | Required | List client's claims |
| `GET` | `/api/claims/:id` | Required | Get claim details |
| `GET` | `/api/claims/admin/all` | Admin | List all claims |
| `POST` | `/api/claims/admin/:id/analyze` | Admin | Run AI pipeline |
| `PATCH` | `/api/claims/admin/:id/decision` | Admin | Record decision |
| `GET` | `/api/health` | Public | Health check |

Full API documentation is available at [`/docs/api-docs`](https://claimguard-ai.vercel.app/docs/api-docs).

---

## 🤖 Prompt Engineering

ClaimGuard.ai uses structured prompts that enforce **JSON-only output** at every AI stage:

**Document Extraction (Groq / Gemini)** — Temperature `0.0`
> *"Return ONLY a raw JSON object — NO markdown, NO code fences, NO explanation text. Use null for any field you cannot find. Do NOT hallucinate."*

**Fraud Detection (Groq LLaMA3)** — Temperature `0.1`
> *"You are an expert medical billing fraud investigator... Before concluding, internally ask: Is ICD billable? Are CPT codes independent? Is cost reasonable? Output exactly this JSON: { upcoding, unbundling, ai_reasoning }"*

The self-questioning chain-of-thought in the fraud prompt significantly reduces false positives and produces an auditable `ai_reasoning` field for human review.

---

## 🧪 Testing

```bash
# Backend (Jest + ts-jest)
cd backend && npm test

# Frontend (Vitest + React Testing Library)
cd frontend && npx vitest run

# With coverage
npm test -- --coverage
```

Test coverage targets: **≥ 80%** for agent logic, **100%** for auth middleware.

---

## 📊 Rules Schema

Clinical validation rules are defined declaratively in `backend/src/data/rules.json`. Each condition specifies its ICD-10 codes, allowed CPT procedures, cost-sharing terms, and fraud detection signals:

```json
{
  "name": "Type 2 Diabetes",
  "icd10": {
    "non_billable": ["E11"],
    "billable": ["E11.9"]
  },
  "allowed_cpt_codes": [
    { "code": "83036", "description": "Hemoglobin A1c test", "allowable_amount": 80.00 },
    { "code": "82947", "description": "Glucose; quantitative, blood" }
  ],
  "financials": { "copay": 15.00, "coinsurance_percent": 0.10 },
  "reasoning_traps": ["Upcoding: Flagging 99215 (Complex visit) for simple refills"]
}
```

To add a new condition: edit `rules.json` → run `npm run rag:index-rules`.

---

## 🗺️ Roadmap

- [ ] Python FastAPI microservice for advanced ML models
- [ ] HIPAA-compliant audit log export
- [ ] Batch claim processing via BullMQ workers
- [ ] Real-time WebSocket event streaming (replace polling)
- [ ] Hospital network portal with bulk submission
- [ ] Multi-language document support
- [ ] Automated A/B testing of fraud detection prompts

---


<div align="center">

Built with ❤️ using Node.js, React, Qdrant, Google Gemini, and Groq

**[Documentation](https://claim-gaurd-ai.vercel.app/docs/installations)** 

</div>
