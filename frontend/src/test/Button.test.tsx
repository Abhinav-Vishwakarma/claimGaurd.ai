import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/ui/Button';

describe('Button Component', () => {
  it('should render with children text', () => {
    render(
      <Button>Click me</Button>
    );
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should apply primary variant by default', () => {
    const { container } = render(
      <Button>Primary Button</Button>
    );
    const button = container.querySelector('a');
    expect(button?.className).toContain('bg-[var(--color-primary)]');
  });

  it('should apply secondary variant when specified', () => {
    const { container } = render(
      <Button variant="secondary">Secondary Button</Button>
    );
    const button = container.querySelector('a');
    expect(button?.className).toContain('border border-[var(--color-border)]');
  });

  it('should accept custom className', () => {
    const { container } = render(
      <Button className="custom-class">Custom Button</Button>
    );
    const button = container.querySelector('a');
    expect(button?.className).toContain('custom-class');
  });

  it('should pass through anchor props', () => {
    const { container } = render(
      <Button href="/test-page" target="_blank">
        External Link
      </Button>
    );
    const button = container.querySelector('a');
    expect(button?.getAttribute('href')).toBe('/test-page');
    expect(button?.getAttribute('target')).toBe('_blank');
  });

  it('should render as inline-flex element', () => {
    const { container } = render(
      <Button>Flex Button</Button>
    );
    const button = container.querySelector('a');
    expect(button?.className).toContain('inline-flex');
  });
});
