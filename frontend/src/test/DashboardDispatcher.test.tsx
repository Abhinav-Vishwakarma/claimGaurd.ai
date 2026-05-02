import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardDispatcher } from '../features/dashboard/DashboardDispatcher';

// Mock auth hook
vi.mock('../features/auth/auth.hooks', () => ({
  useMe: vi.fn(),
}));

// Mock dashboard routers
vi.mock('../features/dashboard/client/DashboardRouter', () => ({
  DashboardRouter: () => <div data-testid="client-dashboard">Client Dashboard</div>,
}));

vi.mock('../features/dashboard/hospital/HospitalDashboardRouter', () => ({
  HospitalDashboardRouter: () => <div data-testid="hospital-dashboard">Hospital Dashboard</div>,
}));

vi.mock('../features/dashboard/admin/AdminDashboardRouter', () => ({
  AdminDashboardRouter: () => <div data-testid="admin-dashboard">Admin Dashboard</div>,
}));

// Mock navigation
vi.mock('../hooks/usePath', () => ({
  navigate: vi.fn(),
}));

import { useMe } from '../features/auth/auth.hooks';
import { navigate } from '../hooks/usePath';

const mockUseMe = useMe as any;
const mockNavigate = navigate as any;

describe('DashboardDispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state while fetching user data', () => {
    mockUseMe.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
    });

    render(<DashboardDispatcher />);
    expect(screen.getByText('Loading your dashboard...')).toBeInTheDocument();
  });

  it('should redirect to login on authentication error', () => {
    mockUseMe.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
    });

    render(<DashboardDispatcher />);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should render client dashboard for CLIENT role', () => {
    mockUseMe.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'client@example.com',
          role: 'CLIENT',
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<DashboardDispatcher />);
    expect(screen.getByTestId('client-dashboard')).toBeInTheDocument();
  });

  it('should render hospital dashboard for HOSPITAL role', () => {
    mockUseMe.mockReturnValue({
      data: {
        user: {
          id: '2',
          email: 'hospital@example.com',
          role: 'HOSPITAL',
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<DashboardDispatcher />);
    expect(screen.getByTestId('hospital-dashboard')).toBeInTheDocument();
  });

  it('should render admin dashboard for ADMIN role', () => {
    mockUseMe.mockReturnValue({
      data: {
        user: {
          id: '3',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<DashboardDispatcher />);
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
  });

  it('should handle unknown role gracefully', () => {
    mockUseMe.mockReturnValue({
      data: {
        user: {
          id: '4',
          email: 'unknown@example.com',
          role: 'UNKNOWN_ROLE',
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<DashboardDispatcher />);
    expect(screen.getByText(/Unknown role assigned: UNKNOWN_ROLE/)).toBeInTheDocument();
  });

  it('should return null when user data is not available', () => {
    mockUseMe.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });

    const { container } = render(<DashboardDispatcher />);
    expect(container.firstChild).toBeNull();
  });
});
