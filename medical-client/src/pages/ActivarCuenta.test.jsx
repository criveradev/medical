import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import ActivarCuenta from './ActivarCuenta';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({ api: { post: vi.fn() } }));

const token = `${'a'.repeat(24)}.${'b'.repeat(43)}`;
const password = 'Una clave nueva y segura';

function abrirActivacion(fragmento = '') {
  window.history.replaceState(null, '', `/activar-cuenta${fragmento}`);
  render(<BrowserRouter><ActivarCuenta /></BrowserRouter>);
}

afterEach(() => {
  vi.resetAllMocks();
  window.history.replaceState(null, '', '/');
});

test('quita el token de la URL y permite activar la cuenta desde la invitación', async () => {
  api.post.mockResolvedValue({});
  abrirActivacion(`#token=${token}`);

  expect(window.location.hash).toBe('');
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: password } });
  const confirmacion = screen.getByLabelText('Confirma la contraseña');
  fireEvent.change(confirmacion, { target: { value: 'Otra clave válida' } });
  fireEvent.click(screen.getByRole('button', { name: 'Activar cuenta' }));
  expect(screen.getByText('Las contraseñas deben coincidir.')).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();

  fireEvent.change(confirmacion, { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Activar cuenta' }));
  expect(await screen.findByRole('heading', { name: 'Cuenta activada' })).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith('/registro/activacion', { token, password });
  expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
});

test('sin enlace válido informa cómo obtener una invitación', () => {
  abrirActivacion('#token=invalido');
  expect(screen.getByText(/Abre el enlace del correo de invitación/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Activar cuenta' })).not.toBeInTheDocument();
});
