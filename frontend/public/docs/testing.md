# Testing Suite

ClaimGuard.ai maintains a backend test suite using **Jest** and a frontend test configuration using **Vitest** with **React Testing Library**. Tests are organized alongside the code they cover.

---

## 🧪 Demo / Testing Credentials

You can use the following credentials to login and test the platform:

**Admin Role**
- Email: `admin@claimguard.com`
- Password: `123456789`

**Client Roles**
- Email: `rohan@gmail.com`
- Password: `12345678`
- Email: `suresh@gmail.com`
- Password: `12345678`

**Test Documents**
Sample test documents for uploading and processing can be found in the `Test_Docs/` folder in the root directory.

---

## Backend Testing (Jest + ts-jest)

### Setup

The backend uses **Jest** as the test runner with **ts-jest** for TypeScript transpilation. Tests are located in the `backend/tests/` directory.

**Configuration** (`jest.config.js`):

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
};
```

### Running Tests

```bash
cd backend

# Run all tests once
npm test

# Run in watch mode (re-runs on file change)
npm run test:watch
```

### What is Covered

| Area | What is Tested |
|---|---|
| **Auth Service** | Login, token generation, refresh, logout, invalid credentials |
| **Claims Service** | Claim creation, status transitions, admin decision flow |
| **Pipeline Logic** | Individual agent unit tests (input → expected output) |
| **Rules Engine** | CPT allowlist matching, ICD-10 specificity checks |
| **Middleware** | JWT authentication, role authorization, request validation |

### Example — Gatekeeper Unit Test

```typescript
import { integrityGatekeeper } from '../src/agents/integrity-gatekeeper';

describe('IntegrityGatekeeper', () => {
  it('should reject claim when patient IDs mismatch', async () => {
    const input = {
      prescription: mockServiceMap({ patient_id: 'MBR-001' }),
      bill:         mockServiceMap({ patient_id: 'MBR-002' }), // mismatch
      labReport:    mockServiceMap({ patient_id: 'MBR-001' }),
    };

    const report = await integrityGatekeeper.run(input);

    expect(report.is_clean_claim).toBe(false);
    expect(report.rejection_reasons[0]).toMatch(/mismatch/i);
  });
});
```

---

## Frontend Testing (Vitest + React Testing Library)

### Setup

The frontend uses **Vitest** (Vite-native test runner) paired with **React Testing Library** for component testing.

Install test dependencies:

```bash
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

**vite.config.ts** (test configuration):

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

### Running Tests

```bash
cd frontend

# Run all tests
npx vitest run

# Watch mode
npx vitest
```

### What is Covered

| Area | What is Tested |
|---|---|
| **Component rendering** | Correct rendering of claim cards, status badges, pipeline views |
| **Form validation** | Login form, claim submission form error states |
| **Hook behavior** | `useTheme` toggle, `useLanguage` locale switching |
| **API mocking** | apiService calls stubbed with `vi.mock` |

### Example — Component Test

```typescript
import { render, screen } from '@testing-library/react';
import { ClaimStatusBadge } from '../components/ui/ClaimStatusBadge';

describe('ClaimStatusBadge', () => {
  it('renders APPROVED status with correct label', () => {
    render(<ClaimStatusBadge status="APPROVED" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('renders PENDING status with correct label', () => {
    render(<ClaimStatusBadge status="PENDING" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});
```

---

## Test Data and Fixtures

Mock service maps and claim objects used across tests are defined in `backend/tests/fixtures/`. These can be imported into any test file for consistent, reproducible test inputs:

```typescript
import { mockPrescriptionServiceMap, mockBillServiceMap } from '../fixtures/service-maps';
```

---

## Coverage Goals

| Category | Target |
|---|---|
| Agent logic (extractor, validator, gatekeeper, adjudicator) | ≥ 80% |
| API route handlers | ≥ 70% |
| Authentication middleware | 100% |
| UI components (critical paths) | ≥ 60% |

Run coverage report:

```bash
# Backend
npm test -- --coverage

# Frontend
npx vitest run --coverage
```
