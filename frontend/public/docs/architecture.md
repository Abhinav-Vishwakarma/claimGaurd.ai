# System Architecture

This document describes the technical architecture of ClaimGuard.ai — the components involved, their responsibilities, and how they communicate.

---

## MVP Architecture

The MVP architecture consists of **three independently running services** that together form the full system:

```
┌───────────────────────────────────────────────────────────┐
│                      Browser / Client                     │
│              React 18 + Vite + TailwindCSS                │
│               (Port 5173 in development)                  │
└─────────────────────────┬─────────────────────────────────┘
                          │ REST API (JSON over HTTP)
                          │ JWT Bearer Token auth
                          ▼
┌───────────────────────────────────────────────────────────┐
│                     Node.js Backend                       │
│           Express 5 + TypeScript + Prisma ORM             │
│               (Port 3001 in development)                  │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Auth    │  │  Claims  │  │  Admin   │  │  Uploads │ │
│  │  Router  │  │  Router  │  │  Router  │  │  Router  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │            Multi-Agent AI Pipeline                   │ │
│  │  Agent 1 (Extractor) → Agent 2 (Validator)          │ │
│  │  → Agent 3 (Gatekeeper) → Agent 4 (Adjudicator)     │ │
│  └──────────────────────────────────────────────────────┘ │
└───────┬──────────────────────────────────────┬────────────┘
        │                                      │
        ▼                                      ▼
┌───────────────┐                    ┌──────────────────┐
│  PostgreSQL   │                    │  Qdrant (Cloud)  │
│  (Prisma ORM) │                    │  Vector Store    │
│               │                    │                  │
│  - Users      │                    │  - Condition     │
│  - Claims     │                    │    embeddings    │
│  - Members    │                    │  - Semantic      │
│  - Payments   │                    │    search        │
└───────────────┘                    └──────────────────┘
        │
        ▼
┌───────────────┐        ┌───────────────────────────────┐
│  Redis        │        │  External AI Services         │
│  (BullMQ)     │        │                               │
│               │        │  - Google Gemini (Vision OCR, │
│  - Job queues │        │    Text Embedding)             │
│  - Session    │        │  - Groq LLaMA3 (Fraud LLM)    │
│    caching    │        │  - UploadThing (File Storage)  │
└───────────────┘        └───────────────────────────────┘
```

---

## Component Responsibilities

### Frontend — React + Vite + TailwindCSS

The frontend is a **single-page application** built with React 18, bundled by Vite, and styled with TailwindCSS. It is organized into **feature modules** (`src/features/`) with shared components and hooks.

**Responsibilities:**
- User authentication (login, register, token refresh)
- Claims management UI (file a claim, view status, track pipeline)
- Admin dashboard (review claims, run AI analysis, make decisions)
- Real-time agent event feed (Server-Sent Events or polling)
- Documentation viewer (this page)

**Key design patterns:**
- Custom hooks for state (`useLanguage`, `useTheme`, `usePath`)
- Feature-based folder structure (not component-based)
- Service layer for API calls (`apiService`, `authService`)

---

### Backend — Node.js + Express + Prisma

The backend is the **central orchestration layer** of the system. It handles all API requests, runs the multi-agent AI pipeline, and manages all data persistence.

**Responsibilities:**
- JWT authentication with access + refresh token flow
- Claim lifecycle management (file → analyze → decide → pay)
- Running the 4-agent AI pipeline on demand
- Database reads/writes via Prisma ORM
- File upload coordination via UploadThing
- Job queuing via BullMQ + Redis

**API surface:**
| Route group | Base path |
|---|---|
| Authentication | `/api/auth` |
| Claims (client) | `/api/claims` |
| Claims (admin) | `/api/claims/admin` |
| Admin management | `/api/admin` |
| Dashboard stats | `/api/dashboard` |
| Health check | `/api/health` |

---

### Database — PostgreSQL + Prisma

PostgreSQL is the **primary relational database**. The schema is managed by Prisma and includes:

- `User` — Registered users with roles (CLIENT, ADMIN, HOSPITAL)
- `Claim` — Filed claims with status, documents, and pipeline output
- `MemberProfile` — Insurance member profiles with policy and payment status
- `PaymentRequest` — Settlement requests between claimants and insurer

---

### Vector Store — Qdrant

Qdrant stores **condition embeddings** for semantic search. It is queried by Agent 2 (Clinical Validator) to identify the closest matching clinical condition for each claim. See the **Vector Database** section for full details.

---

### External AI Services

| Service | Provider | Role |
|---|---|---|
| Gemini Vision | Google | Scanned PDF / image OCR for document extraction |
| Gemini Text | Google | Text-mode extraction fallback + embeddings |
| Groq LLaMA3 | Groq | Low-latency fraud detection inference |

---

## Service Communication

All inter-service communication uses **synchronous HTTP REST**:

- Frontend → Backend: REST API with JWT Bearer token in Authorization header
- Backend → Qdrant: REST via `@langchain/qdrant` + `@qdrant/js-client-rest`
- Backend → Google Gemini: REST via `@google/generative-ai` SDK
- Backend → Groq: REST via `@langchain/google-genai`
- Backend → UploadThing: SDK-managed file upload

There is no inter-service message bus for MVP. BullMQ + Redis provides background job queuing for asynchronous AI pipeline execution.

---

## Product Architecture

*To be added later.*
