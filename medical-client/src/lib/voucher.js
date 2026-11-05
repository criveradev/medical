import { clinica } from '../data/clinic';
import { clp } from './format';

const metodoLabel = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', fonasa: 'Fonasa', isapre: 'Isapre',
};
/** Formatea una fecha ISO a fecha larga y hora corta (es-CL). @param {string} iso @returns {string} */
const fmtFechaHora = (iso) => new Date(iso).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' });
/** Formatea una fecha ISO a fecha y hora cortas (es-CL). @param {string} iso @returns {string} */
const fmtCita = (iso) => new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Construye los datos del voucher a partir de un pago.
 * @param {object} p - Pago con pacienteId y citaId poblados.
 * @returns {{numero:string, fecha:string, paciente:string, cita:string, metodo:string, monto:string}} Datos del voucher.
 */
export function voucherDesdePago(p) {
  const u = p.pacienteId?.usuarioId;
  return {
    numero: p.comprobante || `V-${String(p._id || '').slice(-8).toUpperCase()}`,
    fecha: fmtFechaHora(p.createdAt || Date.now()),
    paciente: u ? `${u.nombre || ''} ${u.apellido || ''}`.trim() : '—',
    cita: p.citaId?.fechaHora ? `${fmtCita(p.citaId.fechaHora)}${p.citaId.motivo ? ` · ${p.citaId.motivo}` : ''}` : '—',
    metodo: metodoLabel[p.metodo] || p.metodo,
    monto: clp(p.monto),
  };
}

/**
 * Abre el voucher en una ventana nueva y lanza la impresión (guardar como PDF).
 * @param {object} v - Datos del voucher (ver voucherDesdePago).
 * @returns {void}
 */
export function imprimirVoucher(v) {
  /**
   * Genera una fila clave/valor del voucher en HTML.
   * @param {string} k - Etiqueta.
   * @param {string} val - Valor.
   * @returns {string} Fila <tr> en HTML.
   */
  const fila = (k, val) =>
    `<tr><td style="padding:6px 0;color:#64748b">${k}</td><td style="padding:6px 0;text-align:right;color:#0f172a;font-weight:500">${val}</td></tr>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Comprobante ${v.numero}</title>
  <style>
    @page{size:A4;margin:0}
    *{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{margin:0;padding:32px;color:#0f172a}
    .box{max-width:360px;margin:0 auto;border:1px solid #e2e8f0;border-radius:14px;padding:24px}
    .top{text-align:center;border-bottom:1px dashed #cbd5e1;padding-bottom:14px;margin-bottom:14px}
    .logo{width:42px;height:42px;border-radius:10px;background:#1f5fa3;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;margin:0 auto 8px}
    .clinic{font-weight:600;font-size:16px}
    .sub{color:#64748b;font-size:12px;margin-top:2px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    .total{margin-top:14px;padding-top:14px;border-top:1px dashed #cbd5e1;display:flex;justify-content:space-between;align-items:center}
    .total b{font-size:22px;color:#1f5fa3}
    .foot{text-align:center;color:#94a3b8;font-size:11px;margin-top:18px}
    @media print{button{display:none}}
  </style></head><body>
    <div class="box">
      <div class="top">
        <div class="logo"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
        <div class="clinic">${clinica.nombre}</div>
        <div class="sub">Comprobante de pago</div>
      </div>
      <table>
        ${fila('N° comprobante', v.numero)}
        ${fila('Fecha', v.fecha)}
        ${fila('Paciente', v.paciente || '—')}
        ${fila('Atención', v.cita)}
        ${fila('Método', v.metodo)}
      </table>
      <div class="total"><span style="color:#64748b">Total</span><b>${v.monto}</b></div>
      <div class="foot">Gracias por preferirnos · ${clinica.direccion}</div>
    </div>
  </body></html>`;
  const w = window.open('', 'voucher', 'width=440,height=700');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
