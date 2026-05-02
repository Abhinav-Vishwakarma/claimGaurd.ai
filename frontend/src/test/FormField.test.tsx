import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormField } from '../features/auth/components/FormField';

describe('FormField Component', () => {
  it('should render label text', () => {
    render(
      <FormField label="Email" type="email" />
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('should render input element with correct type', () => {
    render(
      <FormField label="Email" type="email" />
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('should pass through input attributes', () => {
    render(
      <FormField label="Email" type="email" placeholder="Enter your email" required />
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Enter your email');
    expect(input).toHaveAttribute('required');
  });

  it('should render password toggle button for password inputs', () => {
    render(
      <FormField label="Password" type="password" />
    );
    expect(screen.getByLabelText('Show password')).toBeInTheDocument();
  });

  it('should toggle password visibility on button click', async () => {
    const user = userEvent.setup();
    render(
      <FormField label="Password" type="password" data-testid="password-input" />
    );
    
    const input = screen.getByTestId('password-input');
    const toggleButton = screen.getByLabelText('Show password');
    
    // Initially password type should be 'password'
    expect(input).toHaveAttribute('type', 'password');
    
    // Click to show password
    await user.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');
    
    // Click to hide password again
    await user.click(toggleButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('should not render password toggle for non-password inputs', () => {
    render(
      <FormField label="Username" type="text" />
    );
    expect(screen.queryByLabelText('Show password')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Hide password')).not.toBeInTheDocument();
  });

  it('should update label aria-label on toggle', async () => {
    const user = userEvent.setup();
    render(
      <FormField label="Password" type="password" />
    );
    
    const toggleButton = screen.getByLabelText('Show password');
    
    // Click to show
    await user.click(toggleButton);
    expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
    expect(screen.queryByLabelText('Show password')).not.toBeInTheDocument();
  });

  it('should handle onChange events', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(
      <FormField label="Email" type="email" onChange={handleChange} />
    );
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'test@example.com');
    
    expect(handleChange).toHaveBeenCalled();
  });
});
