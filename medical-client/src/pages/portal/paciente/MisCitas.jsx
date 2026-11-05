import { Link } from 'react-router-dom';
import { CalendarDays, CalendarPlus } from 'lucide-react';
import { useFetch } from '../../../hooks/useFetch';
import { Spinner, ErrorMsg, Badge } from '../../../components/ui';
import { EncabezadoPaciente, FichaPaciente, VacioPaciente } from '../../../components/portal/PacienteUI';
import { estadoColor, labelEstado, fmtFechaHora } from '../../../lib/format';

export default function MisCitas() {
  const { data, loading, error } = useFetch('/citas?limit=50');
  const citas = data?.citas || [];

  return (
    <>
      <EncabezadoPaciente titulo="Mis citas" descripcion="Consulta tus próximas atenciones, su estado y las citas anteriores." icono={CalendarDays}>
        <Link to="/agendar" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-900 transition hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          <CalendarPlus size={18} aria-hidden="true" /> Agendar cita
        </Link>
      </EncabezadoPaciente>
      {loading ? (
        <Spinner label="Cargando citas…" />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : citas.length === 0 ? (
        <VacioPaciente icono={CalendarDays} titulo="Aún no tienes citas agendadas">
          Usa «Agendar cita» para elegir un profesional y consultar sus horarios.
        </VacioPaciente>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {citas.map(cita => {
            const usuario = cita.doctorId?.usuarioId;
            const profesional = usuario ? `Dr(a). ${usuario.nombre} ${usuario.apellido}` : 'Por asignar';
            const especialidad = cita.doctorId?.especialidadId?.nombre;
            return (
              <FichaPaciente key={cita._id} icono={CalendarDays} titulo={fmtFechaHora(cita.fechaHora)}
                detalle={[profesional, especialidad].filter(Boolean).join(' · ')}
                etiqueta={<Badge color={estadoColor[cita.estado] || 'slate'}>{labelEstado[cita.estado] || cita.estado}</Badge>}>
                {cita.motivo && (
                  <p className="rounded-xl bg-brand-50 px-3.5 py-3 text-sm break-words text-slate-700">
                    <span className="font-semibold text-brand-900">Motivo</span><br />{cita.motivo}
                  </p>
                )}
              </FichaPaciente>
            );
          })}
        </div>
      )}
    </>
  );
}
