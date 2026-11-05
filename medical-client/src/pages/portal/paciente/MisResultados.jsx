import { FlaskConical, Download, FileText } from 'lucide-react';
import { useMiFicha } from '../../../hooks/useMiFicha';
import { useFetch } from '../../../hooks/useFetch';
import { PageHeader, Card, Spinner, ErrorMsg, Empty, Badge } from '../../../components/ui';
import { fmtFecha } from '../../../lib/format';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

const tipoLabel = {
  examen_sangre: 'Examen de sangre', radiografia: 'Radiografía', ecografia: 'Ecografía',
  electrocardiograma: 'Electrocardiograma', otro: 'Otro',
};

/**
 * Lista los resultados médicos del paciente, con enlace para ver/descargar el
 * archivo de cada uno.
 * @param {{pacienteId: string}} props - ID del paciente.
 * @returns {JSX.Element}
 */
function Lista({ pacienteId }) {
  const { data, loading, error } = useFetch(`/resultados/paciente/${pacienteId}`);
  const toast = useToast();

  async function descargar(resultadoId) {
    const ventana = window.open('about:blank', '_blank');
    if (ventana) ventana.opener = null;
    try {
      const respuesta = await api.get(`/resultados/${resultadoId}/archivo`);
      if (ventana) ventana.location.href = respuesta.url;
      else window.location.href = respuesta.url;
    } catch (e) {
      if (ventana) ventana.close();
      toast.error(e.message);
    }
  }
  if (loading) return <Spinner />;
  if (error) return <ErrorMsg>{error}</ErrorMsg>;
  const items = data?.resultados || [];
  if (!items.length) return <Card><Empty>Aún no tienes resultados disponibles.</Empty></Card>;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((r) => (
        <Card key={r._id} className="flex flex-col p-5">
          <div className="flex items-start justify-between gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <FlaskConical size={18} />
            </span>
            <Badge color="brand">{tipoLabel[r.tipo] || r.tipo}</Badge>
          </div>
          <h3 className="mt-3 font-medium text-slate-900">{r.nombre}</h3>
          {r.descripcion && <p className="mt-1 text-sm text-slate-500">{r.descripcion}</p>}
          <p className="mt-1 text-xs text-slate-400">{fmtFecha(r.fecha || r.createdAt)}</p>
          {r.tieneArchivo ? (
            <button
              type="button"
              onClick={() => descargar(r._id)}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Download size={16} /> Descargar
            </button>
          ) : (
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-slate-400">
              <FileText size={16} /> Sin archivo adjunto
            </span>
          )}
        </Card>
      ))}
    </div>
  );
}

/**
 * Página "Mis resultados" del paciente: resuelve su ficha y lista sus resultados.
 * @returns {JSX.Element}
 */
export default function MisResultados() {
  const { pacienteId, loading, error } = useMiFicha();
  return (
    <>
      <PageHeader title="Mis resultados" subtitle="Exámenes e informes médicos." />
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : !pacienteId ? (
        <Card><Empty>No tienes una ficha de paciente asociada.</Empty></Card>
      ) : (
        <Lista pacienteId={pacienteId} />
      )}
    </>
  );
}
