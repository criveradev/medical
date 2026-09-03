// Etiquetas, colores y formateadores compartidos.

export const estadoColor = {
  pendiente: 'amber', confirmada: 'brand', completada: 'green', cancelada: 'red', no_asistio: 'slate',
};

export const labelEstado = {
  pendiente: 'Pendiente', confirmada: 'Confirmada', completada: 'Completada',
  cancelada: 'Cancelada', no_asistio: 'No asistió',
};

export const estadoPago = {
  pendiente: 'amber', pagado: 'green', anulado: 'slate',
};

export const APP_TIME_ZONE = 'America/Santiago';

export function fechaCalendario(valor = new Date()) {
  const partes = new Intl.DateTimeFormat('en', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(valor));
  const obtener = (tipo) => partes.find((parte) => parte.type === tipo)?.value;
  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
}

/**
 * Formatea una fecha ISO a fecha y hora local chilena (media/corta).
 * @param {string} iso - Fecha en formato ISO.
 * @returns {string} Fecha y hora formateadas.
 */
export const fmtFechaHora = (iso) =>
  new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short', timeZone: APP_TIME_ZONE });

/**
 * Formatea una fecha ISO a fecha local chilena (dd mmm aaaa).
 * @param {string} iso - Fecha en formato ISO.
 * @returns {string} Fecha formateada.
 */
export const fmtFecha = (iso) =>
  new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: APP_TIME_ZONE });

/**
 * Formatea un RUT chileno al estilo 12.345.678-9 mientras se escribe.
 * @param {string} valor - RUT en cualquier formato (con o sin puntos/guion).
 * @returns {string} RUT formateado con puntos y guion.
 */
export function formatearRut(valor) {
  const limpio = String(valor || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (!limpio) return '';
  if (limpio.length === 1) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const cuerpoFmt = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpoFmt}-${dv}`;
}

/**
 * Formatea un número como moneda chilena (CLP, sin decimales).
 * @param {number} n - Monto a formatear.
 * @returns {string} Monto formateado (ej. "$12.000").
 */
export const clp = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n || 0));
