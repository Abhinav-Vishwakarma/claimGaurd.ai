# Technical Implementation

This section describes the internal architecture of the ClaimGuard.ai frontend and backend codebase — the folder structure, design patterns, and reusable service modules.

---

## Frontend Folder Structure

```
frontend/src/
├── app/                    # Application root and routing
│   ├── App.tsx             # Top-level router (path-based rendering)
│   ├── config/             # App-level configuration constants
│   └── providers/          # Context providers (auth, theme, etc.)
│
├── features/               # Feature modules (domain-driven)
│   ├── auth/               # Login + Registration pages
│   ├── landing/            # Public landing / marketing page
│   ├── home/               # Post-login home page
│   ├── docs/               # Documentation viewer (this page)
│   └── dashboard/          # Role-based dashboards
│       ├── DashboardDispatcher.tsx   # Routes to correct dashboard by role
│       ├── admin/          # Admin dashboard and claim review
│       ├── client/         # Client claim submission and status
│       └── hospital/       # Hospital-side views
│
├── components/             # Shared UI components
│   ├── layout/             # Navbar, Sidebar, ThemeToggle, Footer
│   └── ui/                 # Buttons, Cards, Badges, Modals, etc.
│
├── hooks/                  # Custom React hooks
│   ├── useLanguage.ts      # Locale + i18n support
│   ├── useTheme.ts         # Light/dark mode management
│   ├── usePath.ts          # Client-side routing (no React Router)
│   └── useDebounce.ts      # Debounced value for search inputs
│
├── content/                # Static content / copy
│   └── landing/            # Localized landing page text
│
├── lib/                    # Utility functions and service clients
│   ├── apiService.ts       # Centralized HTTP client
│   └── authService.ts      # Auth token management
│
└── assets/                 # Static assets (images, icons)
```

---

## Feature Module Pattern

Each feature in `src/features/` is **self-contained**: it owns its pages, sub-components, configuration, and local state. This prevents cross-feature coupling and makes features independently testable.

Example — Admin Dashboard:

```
features/dashboard/admin/
├── AdminDashboard.tsx      # Root layout
├── components/             # Admin-specific components
│   ├── AdminSidebar.tsx
│   ├── ClaimCard.tsx
│   └── AgentPipeline.tsx
├── pages/                  # Page-level views
│   ├── ClaimsListPage.tsx
│   └── ClaimDetailPage.tsx
└── config/
    └── adminNav.json       # Navigation items for sidebar
```

---

## Routing

ClaimGuard.ai does **not use React Router**. Instead, routing is handled by a custom `usePath` hook that reads `window.location.pathname` and re-renders on `popstate` events. The `App.tsx` component acts as a manual path-switch:

```tsx
if (path === "/login") return <LoginPage />;
if (path === "/register") return <RegisterPage />;
if (path.startsWith("/dashboard")) return <DashboardDispatcher />;
if (path.startsWith("/docs")) return <DocsPage />;
return <LandingPage />;
```

This keeps the bundle minimal and avoids React Router's complexity for a SPA with limited routes.

---

## Reusable Services

### `apiService` — HTTP Client

All API calls to the backend go through a centralized `apiService`. It handles:

- Base URL injection (from `VITE_API_URL`)
- Attaching the `Authorization: Bearer <token>` header from local storage
- Automatic token refresh on 401 responses
- Error normalization across all endpoints

Usage pattern:

```typescript
import { apiService } from '../../lib/apiService';

const claims = await apiService.get('/api/claims?status=pending');
const newClaim = await apiService.post('/api/claims', { ...claimData });
```

### `authService` — Authentication Management

`authService` manages the full token lifecycle:

- **`login(email, password)`** — Calls `POST /api/auth/login`, stores access + refresh tokens
- **`refresh()`** — Calls `POST /api/auth/refresh` with the stored refresh token, updates access token
- **`logout()`** — Calls `POST /api/auth/logout`, clears all stored tokens
- **`getUser()`** — Returns the decoded JWT payload (user ID, role, email)
- **`isAuthenticated()`** — Returns true if a valid access token exists

Tokens are stored in `localStorage` and the access token is short-lived (15 minutes) with automatic silent refresh.

---

## Backend Folder Structure

```
backend/src/
├── agents/                 # Multi-agent AI pipeline
│   ├── clinical-extractor.ts     # Agent 1: PDF/image → ServiceMap
│   ├── clinical-validator.ts     # Agent 2: Semantic + fraud validation
│   ├── integrity-gatekeeper.ts   # Agent 3: Admin + policy + triangulation
│   ├── financial-adjudicator.ts  # Agent 4: Price scrubbing + cost sharing
│   └── compliance-officer.ts     # (Reserved for future use)
│
├── api/                    # Express route handlers
│   ├── auth/               # Login, register, refresh, logout
│   ├── claims/             # Claim CRUD + AI pipeline trigger
│   ├── admin/              # Admin user and client management
│   ├── dashboard/          # Statistics and overview data
│   ├── ai/                 # AI service abstraction layer
│   ├── ocr/                # OCR type definitions
│   ├── uploads/            # UploadThing webhook handlers
│   └── health/             # Health check endpoint
│
├── config/                 # Service configuration
│   ├── prisma.ts           # Prisma client singleton
│   ├── qdrant.ts           # Qdrant vector store factory
│   ├── embeddings.ts       # Google embedding model factory
│   └── redis.ts            # Redis / BullMQ connection
│
├── data/
│   └── rules.json          # Clinical condition rules + CPT allowlists
│
├── middlewares/
│   ├── auth.ts             # JWT authentication + role authorization
│   └── validate.ts         # Zod request body validation
│
├── rag/
│   └── rule-documents.ts   # Loads rules.json, builds LangChain Documents
│
├── scripts/
│   ├── index-rules.ts      # Embeds rules.json into Qdrant
│   └── search-rules.ts     # CLI tool to test Qdrant search
│
├── tools/
│   └── rule-engine.ts      # searchClaimRules() — Qdrant similarity search
│
├── types/                  # Shared TypeScript types
├── utils/                  # Helpers
│   ├── agent-session.ts    # Event emitter for live pipeline events
│   ├── pipeline-audit.ts   # Structured audit log builder
│   └── document-parser.ts  # pdf-parse + mammoth wrappers
│
├── app.ts                  # Express app setup, middleware, route mounting
└── index.ts                # Server entry point
```

---

## Theme System

The application supports **light and dark modes** via CSS custom properties. Theme tokens are set on `:root` and overridden with a `data-theme="dark"` attribute on `<html>`. The `useTheme` hook manages persistence in `localStorage`.

Core CSS variables:

```css
--color-bg        /* Page background */
--color-surface   /* Card / panel background */
--color-border    /* Dividers and outlines */
--color-text      /* Primary text */
--color-muted     /* Secondary / subdued text */
--color-primary   /* Brand accent (blue) */
```
