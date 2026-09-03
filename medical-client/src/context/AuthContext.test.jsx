import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from '../lib/api';
import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const { user, loading, login, logout } = useAuth();
  if (loading) return <span>loading</span>;
  return (
    <div>
      <span>{user?.email || 'anonymous'}</span>
      <button onClick={() => login('admin@test.com', 'Admin1234')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    api.get.mockReset();
    api.post.mockReset();
  });

  test('restaura la sesión desde el servidor y no desde un JWT local', async () => {
    localStorage.setItem('accessToken', 'legacy-token');
    api.get.mockResolvedValue({
      usuario: { id: '1', email: 'admin@test.com' },
      rol: { nombre: 'administrador', permisos: [] },
    });

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(await screen.findByText('admin@test.com')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/auth/perfil');
  });

  test('inicia y cierra sesión sin persistir tokens de autenticación', async () => {
    api.get.mockRejectedValue(new Error('sin sesión'));
    api.post
      .mockResolvedValueOnce({ usuario: { id: '1', email: 'admin@test.com', rol: 'administrador' } })
      .mockResolvedValueOnce({ mensaje: 'Sesión cerrada correctamente' });

    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('anonymous')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'login' }));
    expect(await screen.findByText('admin@test.com')).toBeInTheDocument();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'logout' }));
    await waitFor(() => expect(screen.getByText('anonymous')).toBeInTheDocument());
  });
});
