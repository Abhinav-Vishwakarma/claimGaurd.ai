import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterPage } from '../features/auth/RegisterPage';
import type { LandingContent } from '../content/landing';
import type { UseThemeResult } from '../hooks/useTheme';
import type { UseLanguageResult } from '../hooks/useLanguage';

// Mock the auth hooks
vi.mock('../features/auth/auth.hooks', () => ({
  useRegister: () => ({
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

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render register form with title', () => {
    render(
      <RegisterPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument();
  });

  it('should render all required input fields', () => {
    render(
      <RegisterPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Role')).toBeInTheDocument();
  });

  it('should render role selection dropdown', () => {
    render(
      <RegisterPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    const roleSelect = screen.getByLabelText('Role') as HTMLSelectElement;
    expect(roleSelect).toBeInTheDocument();
    expect(roleSelect.querySelectorAll('option')).toHaveLength(2);
  });

  it('should render role options: Client and Hospital', () => {
    render(
      <RegisterPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    expect(screen.getByRole('option', { name: 'Client' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Hospital' })).toBeInTheDocument();
  });

  it('should set default role to CLIENT', () => {
    render(
      <RegisterPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    const roleSelect = screen.getByLabelText('Role') as HTMLSelectElement;
    expect(roleSelect.value).toBe('CLIENT');
  });

  it('should render create account button', () => {
    render(
      <RegisterPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('should render go back button', () => {
    render(
      <RegisterPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    expect(screen.getByText('Go back home')).toBeInTheDocument();
  });

  it('should render sign in link', () => {
    render(
      <RegisterPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('should allow user to fill in all form fields', async () => {
    const user = userEvent.setup();
    render(
      <RegisterPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    
    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const roleSelect = screen.getByLabelText('Role');
    
    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'securepass123');
    await user.selectOptions(roleSelect, 'HOSPITAL');
    
    expect(nameInput).toHaveValue('John Doe');
    expect(emailInput).toHaveValue('john@example.com');
    expect(passwordInput).toHaveValue('securepass123');
    expect(roleSelect).toHaveValue('HOSPITAL');
  });

  it('should allow password visibility toggle', async () => {
    const user = userEvent.setup();
    render(
      <RegisterPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    
    const passwordInput = screen.getByLabelText('Password');
    const toggleButton = screen.getByLabelText('Show password');
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('should have password minimum length requirement', () => {
    render(
      <RegisterPage content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('minLength', '8');
  });
});
