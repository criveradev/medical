import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';

let authState;
vi.mock('../../context/AuthContext', () => ({ useAuth: () => authState }));

import ProtectedRoute from './ProtectedRoute';

const renderRoute = () => render(
  <MemoryRouter initialEntries={['/portal']}>
    <Routes>
      <Route path="/login" element={<span>login page</span>} />
      <Route path="/portal" element={<ProtectedRoute><span>private page</span></ProtectedRoute>} />
    </Routes>
  </MemoryRouter>
);

describe('ProtectedRoute', () => {
  test('espera la validación remota antes de decidir', () => {
    authState = { user: null, loading: true };
    renderRoute();
    expect(screen.getByText('Validando sesión…')).toBeInTheDocument();
  });

  test('redirige al login cuando no existe sesión', () => {
    authState = { user: null, loading: false };
    renderRoute();
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  test('muestra la ruta cuando la sesión fue validada', () => {
    authState = { user: { id: '1' }, loading: false };
    renderRoute();
    expect(screen.getByText('private page')).toBeInTheDocument();
  });
});
