import { clinica } from '../data/clinic';
import { formatearRut } from './format';

/**
 * Escapa caracteres HTML especiales para evitar inyección en el documento.
 * @param {*} s - Valor a escapar.
 * @returns {string} Texto con &, < y > escapados.
 */
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Genera y abre la receta médica como documento imprimible/descargable (PDF),
 * con el formato de una receta chilena (datos del profesional y del paciente).
 * @param {object} h - Registro de historial; doctorId poblado (usuarioId, especialidadId, matricula).
 * @param {{nombre?: string, rut?: string}} [pac={}] - Datos del paciente.
 * @returns {void} Abre una ventana de impresión con la receta.
 */
export function imprimirReceta(h, pac = {}) {
  const fecha = new Date(h.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  const doc = h.doctorId || {};
  const docNombre = doc.usuarioId ? `Dr(a). ${doc.usuarioId.nombre} ${doc.usuarioId.apellido}` : 'Profesional';
  const especialidad = doc.especialidadId?.nombre || 'Medicina';
  const registro = doc.matricula || '—';
  const folio = String(h._id || '').slice(-8).toUpperCase();
  const receta = esc(h.receta).replace(/\n/g, '<br>');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receta ${folio}</title>
  <style>
    @page{size:A4;margin:0}
    *{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{margin:0;padding:40px;color:#0f172a}
    .box{max-width:580px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;padding:28px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1f5fa3;padding-bottom:14px}
    .brand{display:flex;align-items:center;gap:10px}
    .logo{width:40px;height:40px;border-radius:10px;background:#1f5fa3;display:flex;align-items:center;justify-content:center}
    .clinic{font-weight:600;font-size:18px}
    .sub{color:#64748b;font-size:12px}
    .ttl{text-align:right}
    .ttl b{font-size:16px;color:#1f5fa3}
    .docbox{margin-top:14px;background:#f8fafc;border-radius:10px;padding:12px 14px;font-size:13px}
    .docbox .n{font-weight:600;font-size:14px}
    .grid{margin-top:14px;display:flex;justify-content:space-between;font-size:13px;gap:12px}
    .grid .k{color:#64748b}
    .diag{margin-top:12px;font-size:13px}
    .diag .k{color:#64748b}
    .rp{margin-top:16px;border:1px dashed #cbd5e1;border-radius:12px;padding:16px;min-height:130px}
    .rp .sym{font-size:26px;font-weight:700;color:#1f5fa3;font-style:italic}
    .rp .body{margin-top:8px;font-size:15px;line-height:1.8;white-space:pre-line}
    .firma{margin-top:52px;text-align:center}
    .firma .line{width:260px;margin:0 auto;border-top:1px solid #94a3b8;padding-top:6px;font-size:13px;font-weight:500}
    .firma .meta{font-size:11px;color:#64748b}
    .foot{text-align:center;color:#94a3b8;font-size:11px;margin-top:18px}
    @media print{button{display:none}}
  </style></head><body>
    <div class="box">
      <div class="top">
        <div class="brand">
          <span class="logo"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></span>
          <div><div class="clinic">${esc(clinica.nombre)}</div><div class="sub">${esc(clinica.direccion)} · ${esc(clinica.telefono)}</div></div>
        </div>
        <div class="ttl"><b>Receta médica</b><div class="sub">Folio ${folio}</div><div class="sub">${fecha}</div></div>
      </div>

      <div class="docbox">
        <div class="n">${esc(docNombre)}</div>
        <div class="sub">${esc(especialidad)} · Reg. Superintendencia de Salud N° ${esc(registro)}</div>
      </div>

      <div class="grid">
        <div><span class="k">Paciente:</span> <b>${esc(pac.nombre)}</b></div>
        <div><span class="k">RUT:</span> ${esc(pac.rut ? formatearRut(pac.rut) : '—')}</div>
      </div>
      <div class="diag"><span class="k">Diagnóstico:</span> ${esc(h.diagnostico)}</div>

      <div class="rp">
        <span class="sym">Rp.</span>
        <div class="body">${receta || '—'}</div>
      </div>
      ${h.tratamiento ? `<div class="diag" style="margin-top:14px"><span class="k">Indicaciones:</span> ${esc(h.tratamiento)}</div>` : ''}

      <div class="firma">
        <div class="line">${esc(docNombre)}</div>
        <div class="meta">${esc(especialidad)} · Reg. N° ${esc(registro)}</div>
      </div>
      <div class="foot">Documento generado electrónicamente por ${esc(clinica.nombre)}</div>
    </div>
  </body></html>`;
  const w = window.open('', 'receta', 'width=560,height=800');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
