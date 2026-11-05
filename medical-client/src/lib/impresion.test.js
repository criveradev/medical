import { beforeEach, expect, test, vi } from 'vitest';
import { imprimirVoucher, voucherDesdePago } from './voucher';
import { imprimirReceta } from './receta';

let documento;
beforeEach(() => {
  documento = { write: vi.fn(), close: vi.fn(), getElementById: () => ({ addEventListener: vi.fn() }), fonts: { ready: new Promise(() => {}) } };
  vi.spyOn(window, 'open').mockReturnValue({
    document: documento, focus: vi.fn(), requestAnimationFrame: vi.fn(), closed: false,
  });
});

test.each(['pendiente', 'pagado', 'anulado'])('conserva el estado %s en el comprobante', estado => {
  const voucher = voucherDesdePago({
    _id: '00001234', createdAt: '2026-11-05T15:00:00Z', estado,
    metodo: 'tarjeta', monto: 25000, pacienteId: { usuarioId: { nombre: 'Ana', apellido: 'Ejemplo' } },
  });
  imprimirVoucher(voucher);
  const html = documento.write.mock.calls[0][0];
  expect(html).toContain(`class="estado ${estado}"`);
  expect(html).toContain(voucher.monto);
  expect(html).toContain('Ana Ejemplo');
});

test('trata los datos del comprobante como texto y no inventa un estado pagado', () => {
  imprimirVoucher({
    numero: '<script>alert(1)</script>', fecha: 'Hoy', paciente: '<img src=x onerror=alert(1)>',
    cita: 'Consulta', metodo: 'Tarjeta', monto: '$25.000',
  });
  const html = documento.write.mock.calls[0][0];
  expect(html).not.toContain('<script>alert(1)</script>');
  expect(html).not.toContain('<img src=x');
  expect(html).toContain('&lt;img src=x');
  expect(html).toContain('Sin información');
});

test('conserva las líneas de la prescripción y escapa HTML en la receta', () => {
  imprimirReceta({
    _id: '00001234', createdAt: '2026-11-05T15:00:00Z',
    receta: 'Primera línea\nSegunda línea <script>alert(1)</script>',
    tratamiento: 'Indicación\nSegunda indicación',
  }, { nombre: 'Ana Ejemplo' });
  const html = documento.write.mock.calls[0][0];
  expect(html).toContain('Primera línea\nSegunda línea &lt;script&gt;alert(1)&lt;/script&gt;');
  expect(html).toContain('Indicación\nSegunda indicación');
  expect(html).not.toContain('<script>alert(1)</script>');
});
