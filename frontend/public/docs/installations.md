# Installation and Setup

ClaimGuard.ai is a multi-service application composed of three independently running layers: a **Node.js backend**, a **React frontend**, and (optionally) a Python AI microservice. Follow the steps below to get the full stack running locally.

---

## Prerequisites

Before you begin, make sure the following are installed on your machine:

| Dependency | Version | Purpose |
|---|---|---|
| Node.js | >= 18.x | Backend + Frontend |
| npm | >= 9.x | Package management |
| PostgreSQL | >= 15 | Primary relational database |
| Qdrant | >= 1.7 | Vector search database |
| Redis | >= 7.x | Job queues (BullMQ) and session caching |
| Git | any | Cloning the repository |

---

## 1. Clone the Repository

```bash
git clone https://github.com/your-org/claimguard-ai.git
cd claimguard-ai
```

---

## 2. Backend Setup

The backend is a Node.js + Express + TypeScript server using Prisma ORM for database access.

### Install Dependencies

```bash
cd backend
npm install
```

### Configure Environment Variables

Create a `.env` file in the `backend/` directory. Use the template below:

```env
# Application
NODE_ENV=development
PORT=3001

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

# Groq (Fraud Detection LLM)
GROQ_API_KEY=your_groq_api_key

# UploadThing (File Storage)
UPLOADTHING_TOKEN=your_uploadthing_token
```

### Initialize the Database with Prisma

```bash
# Generate Prisma client
npx prisma generate

# Run all migrations
npx prisma migrate dev

# (Optional) Seed the database
npx prisma db push
```

### Index Rules into Qdrant

Before the AI pipeline can run vector search, you must embed the `rules.json` knowledge base into Qdrant:

```bash
npm run rag:index-rules
```

This script reads `src/data/rules.json`, generates Google embeddings for each condition, and upserts them into the Qdrant collection.

### Start the Development Server

```bash
npm run dev
```

The backend will be available at `http://localhost:3001`.

---

## 3. Frontend Setup

The frontend is a React + Vite + TailwindCSS single-page application.

### Install Dependencies

```bash
cd ../frontend
npm install
```

### Configure Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:3001
```

### Start the Vite Dev Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## 4. Docker Setup (Optional)

A `docker-compose.yml` is provided in the `backend/` directory for containerizing the supporting services (PostgreSQL, Redis, Qdrant).

```bash
cd backend
docker-compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **Qdrant** on port `6333`

You can then run the backend and frontend natively while the infrastructure runs in Docker. This is the recommended local development approach.

---

## 5. Full Startup Order

For a clean startup, follow this sequence:

1. Start Docker services (PostgreSQL, Redis, Qdrant)
2. Run `npx prisma migrate dev` to apply schema
3. Run `npm run rag:index-rules` to populate Qdrant
4. Start backend: `npm run dev` (in `backend/`)
5. Start frontend: `npm run dev` (in `frontend/`)

---

## Verifying the Setup

Once everything is running, verify with:

```bash
# Health check endpoint
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-05-02T10:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```
