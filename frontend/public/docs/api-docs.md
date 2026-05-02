# API Documentation

ClaimGuard.ai exposes a RESTful API over HTTP. All endpoints return JSON. Protected endpoints require a valid JWT access token in the `Authorization` header.

---

## Authentication

### JWT Bearer Token

ClaimGuard.ai uses a **dual-token auth system**:

- **Access Token** — Short-lived (15 minutes), sent with every protected request
- **Refresh Token** — Long-lived (7 days), used only to obtain new access tokens

Include the access token in every protected request:

```http
Authorization: Bearer <access_token>
```

Tokens are obtained from the login endpoint and should be stored securely in `localStorage` (or `httpOnly` cookies in production).

---

## Authentication Endpoints

### `POST /api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword123",
  "role": "CLIENT"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "jane@example.com", "role": "CLIENT" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

### `POST /api/auth/login`

Authenticate and receive tokens.

**Request Body:**
```json
{
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "jane@example.com", "role": "CLIENT" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Errors:**
- `401` — Invalid credentials
- `422` — Request body validation failed

---

### `POST /api/auth/refresh`

Exchange a refresh token for a new access token.

**Request Body:**
```json
{ "refreshToken": "eyJ..." }
```

**Response `200`:**
```json
{
  "success": true,
  "data": { "accessToken": "eyJ..." }
}
```

---

### `POST /api/auth/logout`

Invalidate the refresh token.

**Request Body:**
```json
{ "refreshToken": "eyJ..." }
```

**Response `200`:**
```json
{ "success": true }
```

---

### `GET /api/auth/me`

Get the currently authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{
  "success": true,
  "data": { "id": "uuid", "email": "jane@example.com", "role": "CLIENT", "name": "Jane Doe" }
}
```

---

## Claims Endpoints

### `POST /api/claims`

File a new insurance claim. Requires authentication.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "prescriptionUrl": "https://utfs.io/f/abc123",
  "billUrl": "https://utfs.io/f/def456",
  "labReportUrl": "https://utfs.io/f/ghi789",
  "prescriptionFilename": "prescription.pdf",
  "billFilename": "hospital_bill.pdf",
  "labReportFilename": "lab_results.pdf"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "claim-uuid",
    "status": "PENDING",
    "createdAt": "2026-05-02T10:00:00.000Z"
  }
}
```

---

### `GET /api/claims`

Get all claims for the authenticated client.

**Query Parameters:**
- `status` — Filter by status: `PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `FLAGGED`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "claim-uuid",
      "status": "APPROVED",
      "createdAt": "2026-05-02T10:00:00.000Z",
      "updatedAt": "2026-05-02T11:00:00.000Z",
      "aiAnalysisResult": { ... }
    }
  ]
}
```

---

### `GET /api/claims/:id`

Get detailed information for a specific claim.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "claim-uuid",
    "status": "APPROVED",
    "prescriptionUrl": "...",
    "billUrl": "...",
    "labReportUrl": "...",
    "aiAnalysisResult": {
      "extraction": { ... },
      "validation": { ... },
      "gatekeeper": { ... },
      "adjudication": { ... }
    },
    "adminDecision": {
      "decision": "APPROVED",
      "remarks": "All checks passed",
      "decidedAt": "2026-05-02T11:00:00.000Z"
    }
  }
}
```

---

## Admin Endpoints

All admin endpoints require `Authorization: Bearer <admin_token>` with role `ADMIN`.

### `GET /api/claims/admin/all`

Get all claims across all clients.

**Query Parameters:**
- `status` — Filter by status
- `page`, `limit` — Pagination

**Response `200`:**
```json
{
  "success": true,
  "data": { "claims": [...], "total": 142, "page": 1, "limit": 20 }
}
```

---

### `POST /api/claims/admin/:id/analyze`

Trigger the full 4-agent AI analysis pipeline for a claim.

**Response `200` (streams events):**

The response body contains a JSON summary of all 4 agent outputs once complete. During execution, real-time events are emitted for frontend display.

```json
{
  "success": true,
  "data": {
    "extraction": { "prescription": {...}, "bill": {...}, "labReport": {...} },
    "validation": { "passed": true, "matched_condition": "Acute Respiratory Infection (Cough)", ... },
    "gatekeeper": { "is_clean_claim": true, ... },
    "adjudication": { "insurerPays": 236.00, "patientResponsibility": 84.00, ... }
  }
}
```

---

### `PATCH /api/claims/admin/:id/decision`

Record a final administrative decision on a claim.

**Request Body:**
```json
{
  "decision": "APPROVED",
  "remarks": "All documentation verified. Payment authorized."
}
```

**`decision` values:** `APPROVED`, `REJECTED`, `FLAGGED`, `PENDING`

**Response `200`:**
```json
{
  "success": true,
  "data": { "id": "claim-uuid", "status": "APPROVED" }
}
```

---

## Health Check

### `GET /api/health`

No authentication required.

**Response `200`:**
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

---

## Error Format

All error responses follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

| HTTP Status | Meaning |
|---|---|
| `400` | Bad request / missing fields |
| `401` | Unauthenticated |
| `403` | Forbidden (wrong role) |
| `404` | Resource not found |
| `422` | Validation error (Zod schema mismatch) |
| `500` | Internal server error |
