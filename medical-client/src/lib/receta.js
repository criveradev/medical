import { APP_TIME_ZONE, formatearRut } from './format';
import { escaparHtml as esc, imprimirDocumento } from './documentoImpresion';

/** Abre la receta con los datos del paciente y del profesional, lista para imprimir. */
export function imprimirReceta(h, pac = {}) {
  const fecha = new Date(h.createdAt).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: APP_TIME_ZONE,
  });
  const doc = h.doctorId || {};
  const docNombre = doc.usuarioId ? `Dr(a). ${doc.usuarioId.nombre} ${doc.usuarioId.apellido}` : 'Profesional';
  const especialidad = doc.especialidadId?.nombre || 'Medicina';
  const registro = doc.matricula || '—';
  const folio = String(h._id || '').slice(-8).toUpperCase() || '—';

  imprimirDocumento({
    ventana: 'receta',
    titulo: 'Receta médica',
    folio,
    fecha,
    contenido: `
      <section class="bloque suave">
        <h2>Profesional tratante</h2>
        <p class="valor">${esc(docNombre)}</p>
        <p>${esc(especialidad)} · Registro profesional ${esc(registro)}</p>
      </section>
      <section class="bloque">
        <h2>Datos del paciente</h2>
        <div class="datos">
          <div><span class="etiqueta">Nombre</span><span class="valor">${esc(pac.nombre || '—')}</span></div>
          <div><span class="etiqueta">RUT</span><span class="valor">${esc(pac.rut ? formatearRut(pac.rut) : '—')}</span></div>
        </div>
      </section>
      <section>
        <h2>Diagnóstico</h2>
        <p class="texto">${esc(h.diagnostico || '—')}</p>
      </section>
      <section class="prescripcion">
        <h2>Prescripción · Rp.</h2>
        <p class="texto">${esc(h.receta || '—')}</p>
      </section>
      ${h.tratamiento ? `<section><h2>Indicaciones</h2><p class="texto">${esc(h.tratamiento)}</p></section>` : ''}
      <section class="firma">
        <strong>${esc(docNombre)}</strong>
        <p class="direccion">${esc(especialidad)} · Registro ${esc(registro)}</p>
        <p class="direccion">Firma del profesional</p>
      </section>
      <footer class="pie">Documento generado electrónicamente por Medical · Folio ${esc(folio)}</footer>
    `,
  });
}
