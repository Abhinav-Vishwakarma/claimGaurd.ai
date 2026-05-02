import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navbar } from '../components/layout/Navbar';
import type { LandingContent } from '../content/landing';
import type { UseThemeResult } from '../hooks/useTheme';
import type { UseLanguageResult } from '../hooks/useLanguage';

// Mock navigation
vi.mock('../hooks/usePath', () => ({
  navigate: vi.fn(),
}));

// Mock config
vi.mock('../app/config/nav.config', () => ({
  navItems: [
    { id: 'home', href: '#top', labelKey: 'home' },
    { id: 'features', href: '#features', labelKey: 'features' },
    { id: 'docs', href: '/docs', labelKey: 'docs' },
  ],
}));

// Mock child components
vi.mock('../components/layout/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="language-selector">Language Selector</div>,
}));

vi.mock('../components/layout/MobileNav', () => ({
  MobileNav: () => <div data-testid="mobile-nav">Mobile Nav</div>,
}));

vi.mock('../components/layout/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

vi.mock('../components/ui/Container', () => ({
  Container: ({ children }: any) => <div>{children}</div>,
}));

const mockContent: LandingContent = {
  nav: {
    label: 'Main navigation',
    menuLabel: 'Toggle menu',
    items: {
      home: 'Home',
      features: 'Features',
      docs: 'Documentation',
    },
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

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render logo', () => {
    render(
      <Navbar content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    expect(screen.getByText('ClaimGuard.ai')).toBeInTheDocument();
  });

  it('should render navigation items', () => {
    render(
      <Navbar content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    // Navigation items are visible on md+ screens
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
  });

  it('should render login and register buttons when user is not authenticated', () => {
    render(
      <Navbar content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('should render logout button when user is authenticated', () => {
    const mockUser = { email: 'test@example.com', role: 'admin' };
    render(
      <Navbar 
        content={mockContent} 
        language={mockLanguage} 
        theme={mockTheme}
        user={mockUser}
      />
    );
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument();
  });

  it('should call onLogout when logout button is clicked', async () => {
    const user = userEvent.setup();
    const mockLogout = vi.fn();
    const mockUser = { email: 'test@example.com', role: 'admin' };
    
    render(
      <Navbar 
        content={mockContent} 
        language={mockLanguage} 
        theme={mockTheme}
        user={mockUser}
        onLogout={mockLogout}
      />
    );
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await user.click(logoutButton);
    
    expect(mockLogout).toHaveBeenCalled();
  });

  it('should render language selector', () => {
    render(
      <Navbar content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    expect(screen.getByTestId('language-selector')).toBeInTheDocument();
  });

  it('should render theme toggle', () => {
    render(
      <Navbar content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('should render mobile menu button', () => {
    render(
      <Navbar content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    const mobileMenuButton = screen.getByLabelText(mockContent.nav.menuLabel);
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('should toggle mobile menu on button click', async () => {
    const user = userEvent.setup();
    render(
      <Navbar content={mockContent} language={mockLanguage} theme={mockTheme} />
    );
    
    const mobileMenuButton = screen.getByLabelText(mockContent.nav.menuLabel);
    
    // Initially closed (shows =)
    expect(mobileMenuButton).toHaveTextContent('=');
    
    // Click to open
    await user.click(mobileMenuButton);
    expect(mobileMenuButton).toHaveTextContent('x');
    
    // Click to close
    await user.click(mobileMenuButton);
    expect(mobileMenuButton).toHaveTextContent('=');
  });
});
