import { ClipboardList, Download } from 'lucide-react';
import { useMiFicha } from '../../../hooks/useMiFicha';
import { useFetch } from '../../../hooks/useFetch';
import { Btn, Spinner, ErrorMsg } from '../../../components/ui';
import { EncabezadoPaciente, FichaPaciente, VacioPaciente } from '../../../components/portal/PacienteUI';
import { fmtFecha } from '../../../lib/format';
import { imprimirReceta } from '../../../lib/receta';

/**
 * Lista el historial clínico del paciente y permite descargar la receta de
 * cada atención.
 * @param {{pacienteId: string, pacienteNombre: string, pacienteRut: string}} props
 * @returns {JSX.Element}
 */
function Lista({ pacienteId, pacienteNombre, pacienteRut }) {
  const { data, loading, error } = useFetch(`/historial/paciente/${pacienteId}`);
  if (loading) return <Spinner label="Cargando historial…" />;
  if (error) return <ErrorMsg>{error}</ErrorMsg>;
  const items = data?.historial || [];
  if (!items.length) return (
    <VacioPaciente icono={ClipboardList} titulo="Aún no hay registros en tu historial">
      Los diagnósticos, tratamientos y recetas aparecerán aquí cuando se registren en tu ficha.
    </VacioPaciente>
  );

  return (
    <div className="grid gap-4">
      {items.map(h => {
        const usuario = h.doctorId?.usuarioId;
        const profesional = usuario ? `Dr(a). ${usuario.nombre} ${usuario.apellido}` : 'Profesional';
        return (
          <FichaPaciente key={h._id} icono={ClipboardList} titulo={h.diagnostico} detalle={profesional}
            etiqueta={<span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">{fmtFecha(h.createdAt)}</span>}>
            {(h.tratamiento || h.receta || h.observaciones) && (
              <dl className="grid gap-3 rounded-xl bg-brand-50 p-4 text-sm break-words text-slate-700">
                {h.tratamiento && <div><dt className="font-semibold text-brand-900">Tratamiento</dt><dd className="mt-1 whitespace-pre-wrap">{h.tratamiento}</dd></div>}
                {h.receta && <div><dt className="font-semibold text-brand-900">Receta</dt><dd className="mt-1 whitespace-pre-wrap">{h.receta}</dd></div>}
                {h.observaciones && <div><dt className="font-semibold text-brand-900">Observaciones</dt><dd className="mt-1 whitespace-pre-wrap">{h.observaciones}</dd></div>}
              </dl>
            )}
            {h.receta && (
              <div>
                <Btn variant="ghost" className="min-h-11" onClick={() => imprimirReceta(h, { nombre: pacienteNombre, rut: pacienteRut })}>
                  <Download size={16} aria-hidden="true" /> Descargar receta
                </Btn>
              </div>
            )}
          </FichaPaciente>
        );
      })}
    </div>
  );
}

/**
 * Página "Mi historial" del paciente: resuelve su ficha y muestra su historial.
 * @returns {JSX.Element}
 */
export default function MiHistorial() {
  const { paciente, pacienteId, loading, error } = useMiFicha();
  const pacienteNombre = `${paciente?.usuarioId?.nombre || ''} ${paciente?.usuarioId?.apellido || ''}`.trim();
  return (
    <>
      <EncabezadoPaciente titulo="Mi historial" descripcion="Revisa tus diagnósticos, tratamientos y recetas en un solo lugar." icono={ClipboardList} />
      {loading ? (
        <Spinner label="Cargando tu ficha…" />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : !pacienteId ? (
        <VacioPaciente icono={ClipboardList} titulo="Tu cuenta aún no tiene una ficha asociada" />
      ) : (
        <Lista pacienteId={pacienteId} pacienteNombre={pacienteNombre} pacienteRut={paciente?.rut} />
      )}
    </>
  );
}
