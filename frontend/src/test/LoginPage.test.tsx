import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../features/auth/LoginPage';
import type { LandingContent } from '../content/landing';
import type { UseThemeResult } from '../hooks/useTheme';
import type { UseLanguageResult } from '../hooks/useLanguage';

// Mock the auth hooks
vi.mock('../features/auth/auth.hooks', () => ({
  useLogin: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

// Mock navigation
vi.mock('../hooks/usePath', () => ({
  navigate: vi.fn(),
}));

const mockContent: LandingContent = {
  nav: {
    label: 'Main navigation',
    menuLabel: 'Toggle menu',
    items: {},
  },
  theme: {
    light: 'Light',
    dark: 'Dark',
  },
} as any;

const mockTheme: UseThemeResult = {
  isDark: false,
  toggle: vi.fn(),
} as any;

const mockLanguage: UseLanguageResult = {
  current: 'en',
  setLanguage: vi.fn(),
} as any;

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form with title', () => {
    render(
      <LoginPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });

  it('should render email and password input fields', () => {
    render(
      <LoginPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('should render sign in button', () => {
    render(
      <LoginPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should render go back button', () => {
    render(
      <LoginPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    expect(screen.getByText('Go back home')).toBeInTheDocument();
  });

  it('should render register link', () => {
    render(
      <LoginPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    expect(screen.getByText('Create an account')).toBeInTheDocument();
  });

  it('should allow user to type in email field', async () => {
    const user = userEvent.setup();
    render(
      <LoginPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    
    const emailInput = screen.getByLabelText('Email');
    await user.type(emailInput, 'test@example.com');
    
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should allow user to type in password field', async () => {
    const user = userEvent.setup();
    render(
      <LoginPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    
    const passwordInput = screen.getByLabelText('Password');
    await user.type(passwordInput, 'securepassword123');
    
    expect(passwordInput).toHaveValue('securepassword123');
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    render(
      <LoginPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    
    const passwordInput = screen.getByLabelText('Password');
    const toggleButton = screen.getByLabelText('Show password');
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
