# Installation and Setup

ClaimGuard.ai is a multi-service application composed of three independently running layers: a **Node.js backend**, a **React frontend**, and (optionally) a Python AI microservice. Follow the steps below to get the full stack running locally.

---

## Prerequisites

Before you begin, make sure the following are installed on your machine:

| Dependency | Version   | Purpose                          |
|------------|-----------|----------------------------------|
| Node.js    | >= 18.x   | Backend + Frontend               |
| npm        | >= 9.x    | Package management               |
| PostgreSQL | >= 15     | Primary relational database      |
| Qdrant     | >= 1.7    | Vector search database           |
| Redis      | >= 7.x    | Job queues (BullMQ) and caching  |
| Git        | any       | Cloning the repository           |
| Docker     | >= 20.x   | Containerizing the infrastructure|

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

### Initialize the Database with Prisma

```bash
# Generate Prisma client
npm run prisma:generate

# Run all migrations
npm run prisma:migrate
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

The backend will be available at `http://localhost:5000`.

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
VITE_API_URL=http://localhost:5000/api/v1
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
`docker-compose up -d`
2. Run `npm run prisma:migrate` to apply schema
npm run prisma:migrate
3. Run `npm run rag:index-rules` to populate Qdrant
npm run rag:index-rules
4. Start backend: `npm run dev` (in `backend/`)
npm run dev
5. Start frontend: `npm run dev` (in `frontend/`)
npm run dev

---

## Verifying the Setup

Once everything is running, verify with:

```bash
# Health check endpoint
curl http://localhost:5000/api/v1/health
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
