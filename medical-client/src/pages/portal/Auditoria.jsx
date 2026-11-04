import { useMemo, useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Badge, Btn, Card, Empty, ErrorMsg, PageHeader, Spinner, inputCls } from '../../components/ui';

const resources = [
  'auth', 'citas', 'departamentos', 'doctores', 'especialidades',
  'historial', 'pacientes', 'pagos', 'reportes', 'resultados',
];
const outcomes = {
  success: { label: 'Exitoso', color: 'green' },
  denied: { label: 'Rechazado', color: 'amber' },
  failure: { label: 'Error', color: 'red' },
};

const fecha = (value) => value
  ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
  : '—';

export default function Auditoria() {
  const [page, setPage] = useState(1);
  const [resource, setResource] = useState('');
  const [outcome, setOutcome] = useState('');
  const url = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '25' });
    if (resource) params.set('resource', resource);
    if (outcome) params.set('outcome', outcome);
    return `/auditoria?${params}`;
  }, [page, resource, outcome]);
  const { data, loading, error } = useFetch(url);
  const events = data?.eventos || [];

  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader title="Auditoría" subtitle="Trazabilidad de accesos y cambios sobre información sensible." />

      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Recurso
          <select className={`${inputCls} mt-1.5`} value={resource} onChange={changeFilter(setResource)}>
            <option value="">Todos</option>
            {resources.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Resultado
          <select className={`${inputCls} mt-1.5`} value={outcome} onChange={changeFilter(setOutcome)}>
            <option value="">Todos</option>
            {Object.entries(outcomes).map(([value, info]) => <option key={value} value={value}>{info.label}</option>)}
          </select>
        </label>
      </Card>

      {loading ? <Spinner /> : error ? <ErrorMsg>{error}</ErrorMsg> : events.length === 0 ? (
        <Card><Empty>No hay eventos para los filtros seleccionados.</Empty></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Acción</th>
                <th className="px-4 py-3 font-medium">Recurso</th>
                <th className="px-4 py-3 font-medium">Ruta</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Request ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((event) => {
                const actor = event.actorId;
                const outcomeInfo = outcomes[event.outcome] || { label: event.outcome, color: 'slate' };
                return (
                  <tr key={event._id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fecha(event.createdAt)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {actor ? `${actor.nombre} ${actor.apellido}` : 'Anónimo'}
                      <span className="block text-xs text-slate-400">{event.actorRole || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{event.action}</td>
                    <td className="px-4 py-3 text-slate-700">{event.resource}</td>
                    <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-slate-500" title={event.path}>{event.method} {event.path}</td>
                    <td className="px-4 py-3"><Badge color={outcomeInfo.color}>{event.statusCode} · {outcomeInfo.label}</Badge></td>
                    <td className="max-w-40 truncate px-4 py-3 font-mono text-xs text-slate-400" title={event.requestId}>{event.requestId}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {(data?.totalPaginas || 0) > 1 && (
        <div className="mt-4 flex items-center justify-end gap-3 text-sm text-slate-500">
          <Btn variant="ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</Btn>
          Página {page} de {data.totalPaginas}
          <Btn variant="ghost" disabled={page >= data.totalPaginas} onClick={() => setPage((value) => value + 1)}>Siguiente</Btn>
        </div>
      )}
    </>
  );
}
