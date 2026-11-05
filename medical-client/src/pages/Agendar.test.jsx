import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import Agendar from './Agendar';
import { api } from '../lib/api';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));
vi.mock('../lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const fechaHora = '2030-06-12T13:00:00.000Z';
const agenda = '/agendar?especialidad=especialidad&doctor=doctor&fecha=2030-06-12';

function DestinoRegistro() {
  return <p>{useLocation().state.agenda}</p>;
}

test('permite elegir cupo sin sesión y conserva la selección al abrir el registro', async () => {
  api.get.mockImplementation(async path => path === '/agenda/profesionales' ? {
    especialidades: [{ _id: 'especialidad', nombre: 'Cardiología' }],
    profesionales: [{ _id: 'doctor', especialidadId: 'especialidad', nombre: 'Carla Soto' }],
  } : { slots: [{ hora: '09:00', fechaHora }] });

  render(
    <MemoryRouter initialEntries={[agenda]}>
      <Routes>
        <Route path="/agendar" element={<Agendar />} />
        <Route path="/registro" element={<DestinoRegistro />} />
      </Routes>
    </MemoryRouter>,
  );

  const cupo = await screen.findByLabelText(/Cupo \(hora/);
  fireEvent.change(cupo, { target: { value: fechaHora } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.getByRole('link', { name: 'Ya tengo cuenta' })).toHaveAttribute('href', '/login');

  fireEvent.click(screen.getByRole('link', { name: 'Soy paciente nuevo' }));
  expect(screen.getByText(`${agenda}&cupo=${encodeURIComponent(fechaHora)}`)).toBeInTheDocument();
});
