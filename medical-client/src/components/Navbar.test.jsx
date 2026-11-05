import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import Navbar from './Navbar';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { rol: 'paciente' }, logout: vi.fn() }),
}));

test('permite volver al dashboard desde la portada con una sesión abierta', () => {
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Navbar />} />
        <Route path="/portal" element={<h1>Dashboard</h1>} />
      </Routes>
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByLabelText('Mi cuenta'));
  expect(screen.getByRole('link', { name: 'Ir al portal' })).toHaveAttribute('href', '/portal');
  fireEvent.click(screen.getByRole('link', { name: 'Ir al portal' }));
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
});
