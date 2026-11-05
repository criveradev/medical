import { APP_TIME_ZONE, clp, estadoPago } from './format';
import { escaparHtml as esc, imprimirDocumento } from './documentoImpresion';

const metodoLabel = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', fonasa: 'Fonasa', isapre: 'Isapre',
};
const fmtFechaHora = iso => new Date(iso).toLocaleString('es-CL', {
  dateStyle: 'long', timeStyle: 'short', timeZone: APP_TIME_ZONE,
});
const fmtCita = iso => new Date(iso).toLocaleString('es-CL', {
  dateStyle: 'short', timeStyle: 'short', timeZone: APP_TIME_ZONE,
});

/** Construye el comprobante a partir de un pago con paciente y cita poblados. */
export function voucherDesdePago(p) {
  const u = p.pacienteId?.usuarioId;
  return {
    numero: p.comprobante || `V-${String(p._id || '').slice(-8).toUpperCase()}`,
    fecha: fmtFechaHora(p.createdAt || Date.now()),
    paciente: u ? `${u.nombre || ''} ${u.apellido || ''}`.trim() : '—',
    cita: p.citaId?.fechaHora ? `${fmtCita(p.citaId.fechaHora)}${p.citaId.motivo ? ` · ${p.citaId.motivo}` : ''}` : '—',
    metodo: metodoLabel[p.metodo] || p.metodo || '—',
    monto: clp(p.monto),
    estado: p.estado,
    fechaPago: p.fechaPago ? fmtFechaHora(p.fechaPago) : null,
  };
}

/** Abre el comprobante imprimible y conserva la opción de guardar como PDF. */
export function imprimirVoucher(v) {
  const estados = { pendiente: 'Pendiente', pagado: 'Pagado', anulado: 'Anulado' };
  const claseEstado = estadoPago[v.estado] ? v.estado : '';
  const estado = estados[v.estado] || 'Sin información';
  imprimirDocumento({
    ventana: 'voucher',
    titulo: 'Comprobante de pago',
    folio: v.numero,
    fecha: v.fecha,
    contenido: `
      <section class="bloque">
        <h2>Datos del pago</h2>
        <div class="datos">
          <div><span class="etiqueta">Paciente</span><span class="valor">${esc(v.paciente || '—')}</span></div>
          <div><span class="etiqueta">Método de pago</span><span class="valor">${esc(v.metodo || '—')}</span></div>
        </div>
        ${v.fechaPago ? `<p style="margin-top:12px"><span class="etiqueta">Fecha de pago</span>${esc(v.fechaPago)}</p>` : ''}
      </section>
      <section class="bloque">
        <h2>Atención asociada</h2>
        <p class="texto">${esc(v.cita || '—')}</p>
      </section>
      <section class="importe" aria-label="Importe y estado">
        <div><span class="etiqueta">Monto registrado</span><strong>${esc(v.monto)}</strong></div>
        <span class="estado ${claseEstado}">${esc(estado)}</span>
      </section>
      <footer class="pie">Gracias por preferir Medical. Conserva este comprobante como referencia de tu registro de pago.</footer>
    `,
  });
}
