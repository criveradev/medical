import { CalendarDays, Stethoscope } from 'lucide-react';
import { useFetch } from '../../../hooks/useFetch';
import { PageHeader, Card, Spinner, ErrorMsg, Empty, Badge } from '../../../components/ui';
import { estadoColor, labelEstado, fmtFechaHora } from '../../../lib/format';

/**
 * Página del paciente con sus propias citas: listado, estado y cancelación.
 * @returns {JSX.Element}
 */
export default function MisCitas() {
  const { data, loading, error } = useFetch('/citas?limit=50');
  const citas = data?.citas || [];

  return (
    <>
      <PageHeader title="Mis citas" subtitle="Tus próximas y pasadas atenciones." />
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : citas.length === 0 ? (
        <Card><Empty>Aún no tienes citas agendadas.</Empty></Card>
      ) : (
        <div className="space-y-3">
          {citas.map((c) => (
            <Card key={c._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <CalendarDays size={20} />
                </span>
                <div>
                  <p className="font-medium text-slate-900">{fmtFechaHora(c.fechaHora)}</p>
                  <p className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Stethoscope size={14} />
                    {c.doctorId?.usuarioId ? `Dr(a). ${c.doctorId.usuarioId.nombre} ${c.doctorId.usuarioId.apellido}` : 'Por asignar'}
                    {c.doctorId?.especialidadId?.nombre ? ` · ${c.doctorId.especialidadId.nombre}` : ''}
                  </p>
                  {c.motivo && <p className="mt-0.5 text-sm text-slate-400">{c.motivo}</p>}
                </div>
              </div>
              <Badge color={estadoColor[c.estado] || 'slate'}>{labelEstado[c.estado] || c.estado}</Badge>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
