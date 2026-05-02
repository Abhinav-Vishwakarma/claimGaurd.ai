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

### Overview

The frontend uses **Vitest** (Vite-native test runner) paired with **React Testing Library** for comprehensive UI component testing. The test suite includes **49 tests** covering authentication flows, UI components, navigation, and role-based dashboard routing.

### Test Configuration

**Configuration Files:**
- **`vitest.config.ts`** - Vitest setup with jsdom environment
- **`src/test/setup.ts`** - Global test setup with mocks for browser APIs
- **`src/test/testUtils.ts`** - Reusable test utilities and mock factories

**vitest.config.ts**:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Test Suite Overview

**Total Tests:** 49 ✓

| Test File | Count | Coverage |
|-----------|-------|----------|
| Button.test.tsx | 6 | UI rendering, variants, props |
| FormField.test.tsx | 8 | Form input, password toggle, events |
| LoginPage.test.tsx | 8 | Auth form, user input, visibility |
| Navbar.test.tsx | 9 | Navigation, auth state, mobile menu |
| DashboardDispatcher.test.tsx | 7 | Role-based routing, loading states |
| RegisterPage.test.tsx | 11 | Registration form, role selection |

### Detailed Tests by Category

#### 1. Core UI Components (6 tests)
**File:** `src/test/Button.test.tsx`

- ✓ Renders children text correctly
- ✓ Applies primary variant by default
- ✓ Applies secondary variant styling
- ✓ Accepts custom className
- ✓ Passes through anchor props (href, target)
- ✓ Renders as inline-flex element

#### 2. Form Field Component (8 tests)
**File:** `src/test/FormField.test.tsx`

- ✓ Renders label text
- ✓ Renders input with correct type
- ✓ Passes through input attributes (placeholder, required)
- ✓ Renders password toggle button for password inputs
- ✓ Toggles password visibility on button click
- ✓ Does not render toggle for non-password inputs
- ✓ Updates aria-label on toggle
- ✓ Handles onChange events

#### 3. Authentication Pages (19 tests)
**LoginPage Tests (8 tests):** `src/test/LoginPage.test.tsx`
- ✓ Renders login form with title
- ✓ Renders email and password input fields
- ✓ Renders sign in button and go back button
- ✓ Renders register link
- ✓ Allows user to type in email/password fields
- ✓ Toggles password visibility

**RegisterPage Tests (11 tests):** `src/test/RegisterPage.test.tsx`
- ✓ Renders register form with all required fields (name, email, password, role)
- ✓ Renders role selection dropdown with Client/Hospital options
- ✓ Sets default role to CLIENT
- ✓ Renders create account button
- ✓ Allows user to fill all form fields
- ✓ Allows password visibility toggle
- ✓ Enforces password minimum length requirement

#### 4. Navigation Component (9 tests)
**File:** `src/test/Navbar.test.tsx`

- ✓ Renders logo
- ✓ Renders navigation items
- ✓ Renders login/register buttons when unauthenticated
- ✓ Renders logout button when authenticated
- ✓ Calls onLogout when logout button is clicked
- ✓ Renders language selector and theme toggle
- ✓ Renders mobile menu button
- ✓ Toggles mobile menu on button click

#### 5. Dashboard Routing (7 tests)
**File:** `src/test/DashboardDispatcher.test.tsx`

- ✓ Shows loading state while fetching user data
- ✓ Redirects to login on authentication error
- ✓ Renders CLIENT dashboard for CLIENT role
- ✓ Renders HOSPITAL dashboard for HOSPITAL role
- ✓ Renders ADMIN dashboard for ADMIN role
- ✓ Handles unknown role gracefully
- ✓ Returns null when user data is not available

### Running Tests

```bash
cd frontend

# Run all tests once (CI mode)
npm test -- --run

# Watch mode (re-runs on file change)
npm test

# Run tests with Vitest UI dashboard
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- src/test/Button.test.tsx
```

### Test Utilities

**Available Helpers (`src/test/testUtils.ts`):**

```typescript
// Mock content factory
createMockContent(overrides?)

// Mock theme factory
createMockTheme(overrides?)

// Mock language factory
createMockLanguage(overrides?)

// Mock user factory
createMockUser(overrides?)

// Custom render with providers
renderWithProviders(ui, options?)
```

**Example Usage:**

```typescript
import { createMockContent, createMockTheme } from '../test/testUtils';

const mockContent = createMockContent({
  nav: { items: { home: 'Home' } }
});

const mockTheme = createMockTheme({ isDark: true });
```

### Best Practices

#### 1. User Interactions
```typescript
import userEvent from '@testing-library/user-event';

it('test', async () => {
  const user = userEvent.setup();
  await user.type(input, 'text');
  await user.click(button);
});
```

#### 2. Element Querying
- Prefer `getByRole()` for accessibility
- Use `getByLabelText()` for form fields
- Use `getByTestId()` only when necessary

#### 3. Example Test
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../features/auth/LoginPage';

describe('LoginPage', () => {
  it('should allow user to type in email field', async () => {
    const user = userEvent.setup();
    render(<LoginPage {...props} />);
    
    const emailInput = screen.getByLabelText('Email');
    await user.type(emailInput, 'test@example.com');
    
    expect(emailInput).toHaveValue('test@example.com');
  });
});
```

### Mocking Strategy

**Global Mocks (setup.ts):**
- `window.matchMedia` - For theme/responsive queries
- `IntersectionObserver` - For lazy loading

**Test File Mocks:**
Each test file mocks its dependencies:
- Auth hooks (`useLogin`, `useRegister`, `useMe`)
- Navigation (`navigate` function)
- Child components
- Config files

**Example Mock:**
```typescript
vi.mock('../features/auth/auth.hooks', () => ({
  useLogin: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}));
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot read properties of undefined" | Ensure `userEvent.setup()` is called in async tests |
| "Found multiple elements with..." | Use `getByRole()` with specific options like `{ name: /Login/i }` |
| Tests timing out | Increase timeout: `it('test', async () => {}, { timeout: 10000 })` |
| Component not rendering | Check mocked child components and hooks |

### Code Coverage

Target coverage goals:
- **Statements:** >80%
- **Branches:** >75%
- **Functions:** >80%
- **Lines:** >80%

Run coverage:
```bash
npm run test:coverage
```

### Next Steps

**Phase 2: Integration Tests** (Recommended)
- Test API integration with mock backends
- Test complex user flows (login → create claim → submit)
- Test error handling and edge cases

**Phase 3: E2E Tests** (Future)
- Use Playwright or Cypress
- Test real browser interactions
- Test complete user workflows end-to-end

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
