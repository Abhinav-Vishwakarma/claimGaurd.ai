# API Documentation

## Authentication

All API endpoints (except login and register) require a valid JWT token sent in the `Authorization` header as a Bearer token.

## Endpoints

### `POST /api/auth/login`
- Body: `{ email, password }`
- Returns: `{ token, user }`

### `GET /api/claims`
- Query Params: `?status=pending`
- Returns: Array of claim objects.
