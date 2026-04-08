import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

vi.mock('../../../contexts/AuthContext', () => {
  let mockAuth = {
    user: null as { id: string } | null,
    isLoading: false,
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

const authModule = await import('../../../contexts/AuthContext') as any;

const renderRoute = (initialRoute = '/protected') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};

describe('ProtectedRoute', () => {
  it('redirects to login when no user', () => {
    authModule.__setAuth({ user: null, isLoading: false });
    renderRoute();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when user exists', () => {
    authModule.__setAuth({ user: { id: '1' }, isLoading: false });
    renderRoute();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows loading spinner while auth is loading', () => {
    authModule.__setAuth({ user: null, isLoading: true });
    renderRoute();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
