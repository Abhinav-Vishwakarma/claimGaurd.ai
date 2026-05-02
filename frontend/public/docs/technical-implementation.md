# Technical Implementation

## Folder Structure

- `src/features`: Feature-based modules (e.g., dashboard, auth).
- `src/components`: Reusable UI components.
- `src/hooks`: Custom React hooks.
- `src/app`: App configuration and routing.

## Reusable Services

- `apiService`: Wraps `fetch` or `axios` for authenticated requests.
- `authService`: Manages tokens and user session.

## Testing Suite

We use Vitest and React Testing Library for frontend testing. Run `npm run test` to execute the test suite.
