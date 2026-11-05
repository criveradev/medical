import { FlaskConical, Download, FileText } from 'lucide-react';
import { useMiFicha } from '../../../hooks/useMiFicha';
import { useFetch } from '../../../hooks/useFetch';
import { Btn, Spinner, ErrorMsg, Badge } from '../../../components/ui';
import { EncabezadoPaciente, FichaPaciente, VacioPaciente } from '../../../components/portal/PacienteUI';
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
  if (loading) return <Spinner label="Cargando resultados…" />;
  if (error) return <ErrorMsg>{error}</ErrorMsg>;
  const items = data?.resultados || [];
  if (!items.length) return (
    <VacioPaciente icono={FlaskConical} titulo="Aún no tienes resultados disponibles">
      Aquí podrás consultar tus exámenes e informes cuando se publiquen en el portal.
    </VacioPaciente>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map(r => (
        <FichaPaciente key={r._id} icono={FlaskConical} titulo={r.nombre}
          detalle={fmtFecha(r.fecha || r.createdAt)} etiqueta={<Badge color="brand">{tipoLabel[r.tipo] || r.tipo}</Badge>}>
          {r.descripcion && <p className="rounded-xl bg-brand-50 p-3.5 text-sm break-words text-slate-700">{r.descripcion}</p>}
          <div className="mt-auto border-t border-brand-100 pt-3">
            {r.tieneArchivo ? (
              <Btn type="button" variant="ghost" className="min-h-11" onClick={() => descargar(r._id)}>
                <Download size={16} aria-hidden="true" /> Descargar
              </Btn>
            ) : (
              <span className="inline-flex items-center gap-2 py-2 text-sm text-slate-600">
                <FileText size={16} aria-hidden="true" /> Sin archivo adjunto
              </span>
            )}
          </div>
        </FichaPaciente>
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
      <EncabezadoPaciente titulo="Mis resultados" descripcion="Consulta tus exámenes e informes médicos y descarga los archivos disponibles." icono={FlaskConical} />
      {loading ? (
        <Spinner label="Cargando tu ficha…" />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : !pacienteId ? (
        <VacioPaciente icono={FlaskConical} titulo="Tu cuenta aún no tiene una ficha asociada" />
      ) : (
        <Lista pacienteId={pacienteId} />
      )}
    </>
  );
}
