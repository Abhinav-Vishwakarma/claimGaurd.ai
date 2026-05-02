# The Diagram

## System Architecture

The application follows a client-server architecture:
- **Frontend**: React + Vite + TailwindCSS.
- **Backend**: Node.js + Express + Prisma (SQL).
- **AI Server**: Python + FastAPI (for vector embeddings and LLM integrations).

## Pipeline Flow

1. **Extraction**: Upload PDF -> Extract text.
2. **Judging**: AI models assess clinical validity.
3. **Gatekeeping**: Compliance and rules engine check.
4. **Adjudication**: Final summary and risk scoring.
