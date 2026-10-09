import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

vi.mock('../../../contexts/useAuth', () => {
  let mockAuth = {
    user: null as { id: string } | null,
    isLoading: false,
    deactivatedEmail: null as string | null,
  };
  return {
    useAuth: () => mockAuth,
    __setAuth: (v: Partial<typeof mockAuth>) => {
      mockAuth = { ...mockAuth, ...v };
    },
  };
});

import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const authModule = (await import('../../../contexts/useAuth')) as typeof import('../../../contexts/useAuth') & {
  __setAuth: (
    v: Partial<{ user: { id: string } | null; isLoading: boolean; deactivatedEmail: string | null }>,
  ) => void;
};

const renderRoute = (initialRoute = '/protected') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/reactivate" element={<div>Reactivate Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};

describe('ProtectedRoute', () => {
  it('redirects to login when no user', () => {
    authModule.__setAuth({ user: null, isLoading: false, deactivatedEmail: null });
    renderRoute();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when user exists', () => {
    authModule.__setAuth({ user: { id: '1' }, isLoading: false });
    renderRoute();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects a deactivated account to the reactivation prompt', () => {
    authModule.__setAuth({
      user: { id: '1', accountStatus: 'deactivated' } as { id: string },
      isLoading: false,
    });
    renderRoute();
    expect(screen.getByText('Reactivate Page')).toBeInTheDocument();
  });

  it('redirects to the reactivation prompt when the session ended by deactivation', () => {
    authModule.__setAuth({ user: null, isLoading: false, deactivatedEmail: 'alice@example.com' });
    renderRoute();
    expect(screen.getByText('Reactivate Page')).toBeInTheDocument();
    authModule.__setAuth({ deactivatedEmail: null });
  });

  it('shows loading spinner while auth is loading', () => {
    authModule.__setAuth({ user: null, isLoading: true });
    renderRoute();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
