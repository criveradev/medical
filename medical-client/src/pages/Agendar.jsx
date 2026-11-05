import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { api } from '../lib/api';
import { Btn, ErrorMsg, Spinner } from '../components/ui';
import FlujoPublico, { botonPublico, campoPublico, PasosPublicos } from '../components/FlujoPublico';
import { fmtFecha } from '../lib/format';

const pasos = ['Profesional', 'Horario', 'Confirmación'];

function Cupos({ resultado, seleccionado, onSelect }) {
  if (!resultado) return <Spinner />;
  if (resultado.error) return <ErrorMsg>{resultado.error}</ErrorMsg>;

  return (
    <label>
      Cupo (hora de la clínica)
      <select className={campoPublico} value={resultado.slots.some(slot => slot.fechaHora === seleccionado) ? seleccionado : ''}
        onChange={e => onSelect(e.target.value)}>
        <option value="">Selecciona un cupo</option>
        {resultado.slots.map(slot => <option key={slot.fechaHora} value={slot.fechaHora}>{slot.hora}</option>)}
      </select>
      {resultado.slots.length === 0 && <span className="text-sm text-slate-500">No hay cupos para esta fecha.</span>}
    </label>
  );
}

export default function Agendar() {
  const { user, loading: cargandoSesion } = useAuth();
  const { data, error, loading } = useFetch('/agenda/profesionales');
  const [seleccion, setSeleccion] = useSearchParams();
  const [mostrarAcceso, setMostrarAcceso] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [tipo, setTipo] = useState('primera_vez');
  const [guardando, setGuardando] = useState(false);
  const [errorReserva, setErrorReserva] = useState('');
  const [versionCupos, setVersionCupos] = useState(0);
  const [reservada, setReservada] = useState(false);
  const [cuposActuales, setCuposActuales] = useState(null);
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  const especialidadId = seleccion.get('especialidad') || '';
  const profesionales = (data?.profesionales || []).filter(profesional => profesional.especialidadId === especialidadId);
  const profesional = profesionales.find(item => item._id === seleccion.get('doctor'));
  const doctorId = profesional?._id || '';
  const especialidad = data?.especialidades.find(item => item._id === especialidadId);
  const fecha = seleccion.get('fecha') || '';
  const cupo = seleccion.get('cupo') || '';
  const claveCupos = `${doctorId}:${fecha}:${versionCupos}`;
  const resultadoCupos = cuposActuales?.clave === claveCupos ? cuposActuales : null;
  const cupoElegido = resultadoCupos?.slots?.find(slot => slot.fechaHora === cupo);
  const cupoDisponible = Boolean(cupoElegido);

  useEffect(() => {
    if (!doctorId || !fecha) return;
    let vigente = true;
    api.get(`/agenda/cupos/${encodeURIComponent(doctorId)}?fecha=${encodeURIComponent(fecha)}`)
      .then(data => vigente && setCuposActuales({ clave: claveCupos, slots: data.slots || [] }))
      .catch(error => vigente && setCuposActuales({ clave: claveCupos, error: error.message }));
    return () => { vigente = false; };
  }, [doctorId, fecha, claveCupos]);

  function actualizar(cambios) {
    setErrorReserva('');
    setMostrarAcceso(false);
    const siguiente = new URLSearchParams(seleccion);
    for (const [campo, valor] of Object.entries(cambios)) {
      if (valor) siguiente.set(campo, valor);
      else siguiente.delete(campo);
    }
    setSeleccion(siguiente, { replace: true });
  }

  async function confirmar(e) {
    e.preventDefault();
    if (guardando || !cupoDisponible) return;
    if (!user) {
      setMostrarAcceso(true);
      return;
    }
    setGuardando(true);
    try {
      await api.post('/agenda/reservas', { doctorId, fechaHora: cupo, motivo: motivo.trim(), tipo });
      setReservada(true);
      navigate('/agendar', { replace: true });
    } catch (error) {
      actualizar({ cupo: '' });
      setErrorReserva(error.message);
      setVersionCupos(version => version + 1);
    } finally {
      setGuardando(false);
    }
  }

  const regreso = { agenda: pathname + search };

  return (
    <FlujoPublico
      seccion="Agenda en línea"
      volverA={user ? '/portal' : '/'}
      volverTexto={user ? 'Volver al portal' : 'Volver al inicio'}
      titulo={reservada ? 'Cita agendada' : 'Agendar cita'}
      descripcion={reservada ? 'Puedes consultar el estado de tu cita en el portal.' : 'Selecciona la atención que necesitas y elige un cupo disponible.'}
      mensaje="Elige cuándo atenderte"
      detalle="Consulta los horarios de los profesionales y revisa tu selección antes de reservar."
      lateral={<PasosPublicos pasos={pasos} actual={cupoDisponible ? 2 : doctorId ? 1 : 0} terminado={reservada} />}
    >
      {reservada ? (
        <div role="status" className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <CheckCircle2 size={28} aria-hidden="true" />
          <p className="font-semibold">Tu cita quedó agendada.</p>
          <Link to="/portal/mis-citas" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900">
            Ver mis citas <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          {loading ? <Spinner label="Cargando profesionales…" /> : data && (
            <form onSubmit={confirmar} className="space-y-5 text-sm">
              <fieldset disabled={guardando} className="grid min-w-0 gap-4 font-medium text-slate-700 sm:grid-cols-2">
                <label>Especialidad
                  <select className={campoPublico} value={especialidadId}
                    onChange={e => actualizar({ especialidad: e.target.value, doctor: '', fecha: '', cupo: '' })}>
                    <option value="">Selecciona una especialidad</option>
                    {data.especialidades.map(item => <option key={item._id} value={item._id}>{item.nombre}</option>)}
                  </select>
                </label>
                {especialidadId && <label>Profesional
                  <select className={campoPublico} value={doctorId}
                    onChange={e => actualizar({ doctor: e.target.value, fecha: '', cupo: '' })}>
                    <option value="">Selecciona un profesional</option>
                    {profesionales.map(item => <option key={item._id} value={item._id}>{item.nombre}</option>)}
                  </select>
                  {profesionales.length === 0 && <span className="text-sm text-slate-500">No hay profesionales en esta especialidad.</span>}
                </label>}
                {doctorId && <label>Fecha
                  <input className={campoPublico} type="date" value={fecha}
                    onChange={e => actualizar({ fecha: e.target.value, cupo: '' })} />
                </label>}
                {doctorId && fecha && (
                  <Cupos resultado={resultadoCupos} seleccionado={cupo}
                    onSelect={valor => actualizar({ cupo: valor })} />
                )}
                {cupoDisponible && user?.rol === 'paciente' && <>
                  <label>Tipo de consulta
                    <select className={campoPublico} value={tipo} onChange={e => setTipo(e.target.value)}>
                      <option value="primera_vez">Primera vez</option>
                      <option value="control">Control</option>
                    </select>
                  </label>
                  <label className="sm:col-span-2">Motivo de la consulta
                    <textarea className={campoPublico} rows={3} required minLength={5} maxLength={300} value={motivo}
                      onChange={e => setMotivo(e.target.value)} />
                  </label>
                </>}
              </fieldset>
              {cupo && resultadoCupos?.slots && !cupoDisponible && (
                <ErrorMsg>El cupo elegido ya no está disponible. Elige otro horario.</ErrorMsg>
              )}
              {errorReserva && <ErrorMsg>{errorReserva}</ErrorMsg>}
              {cupoElegido && (
                <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-brand-900">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-700">
                    <CalendarDays size={20} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Resumen de tu cita</p>
                    <p className="mt-1 font-semibold break-words">{profesional.nombre}</p>
                    <p className="mt-1 break-words">{especialidad?.nombre} · {fmtFecha(cupo)} · {cupoElegido.hora} h</p>
                  </div>
                </div>
              )}
              {cupoDisponible && user && user.rol !== 'paciente' && (
                <p className="rounded-xl bg-amber-50 p-3 text-amber-950">Inicia sesión con una cuenta de paciente para reservar.</p>
              )}
              {cupoDisponible && (!user || user.rol === 'paciente') && (
                <Btn type="submit" className={botonPublico} disabled={guardando || cargandoSesion}>
                  {guardando ? 'Reservando…' : 'Confirmar reserva'}
                  {!guardando && <ArrowRight size={16} aria-hidden="true" />}
                </Btn>
              )}
              {mostrarAcceso && cupoDisponible && !user && (
                <div className="rounded-2xl border border-brand-100 p-4">
                  <p className="mb-3 font-medium text-slate-700">¿Cómo quieres continuar?</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Link to="/login" state={regreso} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-200 px-3 py-2 text-center font-semibold text-brand-800 hover:bg-brand-50">
                      <LogIn size={16} className="shrink-0" aria-hidden="true" /> Ya tengo cuenta
                    </Link>
                    <Link to="/registro" state={regreso} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-200 px-3 py-2 text-center font-semibold text-brand-800 hover:bg-brand-50">
                      <UserPlus size={16} className="shrink-0" aria-hidden="true" /> Soy paciente nuevo
                    </Link>
                  </div>
                </div>
              )}
            </form>
          )}
        </>
      )}
    </FlujoPublico>
  );
}
