import { Stethoscope, ClipboardList, Download } from 'lucide-react';
import { useMiFicha } from '../../../hooks/useMiFicha';
import { useFetch } from '../../../hooks/useFetch';
import { PageHeader, Card, Btn, Spinner, ErrorMsg, Empty } from '../../../components/ui';
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
  if (loading) return <Spinner />;
  if (error) return <ErrorMsg>{error}</ErrorMsg>;
  const items = data?.historial || [];
  if (!items.length) return <Card><Empty>Aún no hay registros en tu historial.</Empty></Card>;

  return (
    <div className="space-y-3">
      {items.map((h) => (
        <Card key={h._id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 font-medium text-slate-900">
              <ClipboardList size={16} className="text-brand-600" /> {h.diagnostico}
            </p>
            <span className="shrink-0 text-xs text-slate-400">{fmtFecha(h.createdAt)}</span>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
            <Stethoscope size={14} />
            {h.doctorId?.usuarioId ? `Dr(a). ${h.doctorId.usuarioId.nombre} ${h.doctorId.usuarioId.apellido}` : 'Profesional'}
          </p>
          {h.tratamiento && <p className="mt-2 text-sm text-slate-700"><span className="font-medium">Tratamiento:</span> {h.tratamiento}</p>}
          {h.receta && <p className="mt-1 text-sm text-slate-700"><span className="font-medium">Receta:</span> {h.receta}</p>}
          {h.observaciones && <p className="mt-1 text-sm text-slate-500">{h.observaciones}</p>}
          {h.receta && (
            <div className="mt-3">
              <Btn variant="ghost" onClick={() => imprimirReceta(h, { nombre: pacienteNombre, rut: pacienteRut })}>
                <Download size={15} /> Descargar receta
              </Btn>
            </div>
          )}
        </Card>
      ))}
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
      <PageHeader title="Mi historial" subtitle="Diagnósticos, tratamientos y recetas." />
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : !pacienteId ? (
        <Card><Empty>No tienes una ficha de paciente asociada.</Empty></Card>
      ) : (
        <Lista pacienteId={pacienteId} pacienteNombre={pacienteNombre} pacienteRut={paciente?.rut} />
      )}
    </>
  );
}
