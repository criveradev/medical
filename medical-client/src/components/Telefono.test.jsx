import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import Telefono from './Telefono';

test('muestra banderas del selector de teléfono sin cargar imágenes externas', () => {
  const { container } = render(<Telefono value="" onChange={vi.fn()} />);
  const selector = screen.getByRole('combobox');
  const icono = container.querySelector('.PhoneInputCountryIcon');

  expect(selector).toHaveValue('CL');
  expect(icono.querySelector('svg title')).toHaveTextContent('Chile');

  fireEvent.change(selector, { target: { value: 'US' } });

  expect(selector).toHaveValue('US');
  expect(icono.querySelector('svg title')).toHaveTextContent('United States');
  expect(icono.querySelector('img')).toBeNull();
});
