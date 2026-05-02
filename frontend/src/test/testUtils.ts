import React from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import type { LandingContent } from '../content/landing';
import type { UseThemeResult } from '../hooks/useTheme';
import type { UseLanguageResult } from '../hooks/useLanguage';

/**
 * Mock content factory for tests
 */
export const createMockContent = (overrides?: Partial<LandingContent>): LandingContent => ({
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
  ...overrides,
} as LandingContent);

/**
 * Mock theme factory for tests
 */
export const createMockTheme = (overrides?: Partial<UseThemeResult>): UseThemeResult => ({
  isDark: false,
  toggle: () => {},
  ...overrides,
} as UseThemeResult);

/**
 * Mock language factory for tests
 */
export const createMockLanguage = (overrides?: Partial<UseLanguageResult>): UseLanguageResult => ({
  current: 'en',
  setLanguage: () => {},
  ...overrides,
} as UseLanguageResult);

/**
 * Custom render function that can be extended with providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  { ...renderOptions }: RenderOptions = {}
) {
  return rtlRender(ui, { ...renderOptions });
}

/**
 * Create mock user object
 */
export const createMockUser = (overrides?: any) => ({
  id: '1',
  email: 'test@example.com',
  role: 'CLIENT',
  ...overrides,
});

export * from '@testing-library/react';
