import { useState, useRef, useEffect } from 'react';
import { Plus, CalendarClock, ChevronDown, Pencil, Ban } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Card, Btn, Modal, Field, ErrorMsg, Spinner, Empty, Badge, inputCls } from '../../components/ui';
import { APP_TIME_ZONE, fechaCalendario } from '../../lib/format';

const ESTADOS = ['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio'];
const estadoColor = {
  pendiente: 'amber', confirmada: 'brand', completada: 'green', cancelada: 'red', no_asistio: 'slate',
};
const labelEstado = {
  pendiente: 'Pendiente', confirmada: 'Confirmada', completada: 'Completada',
  cancelada: 'Cancelada', no_asistio: 'No asistió',
};
const dotEstado = {
  pendiente: 'bg-amber-500', confirmada: 'bg-brand-500', completada: 'bg-green-500',
  cancelada: 'bg-red-500', no_asistio: 'bg-slate-400',
};

/**
 * Menú desplegable para cambiar el estado de una cita (reemplaza el <select>
 * nativo). Usa posición fija para no quedar recortado por el overflow.
 * @param {{actual: string, onChange: function(string): void}} props
 * @returns {JSX.Element}
 */
function CambiarEstado({ actual, onChange }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const cerrar = () => setOpen(false);
    const click = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    document.addEventListener('mousedown', click);
    return () => {
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
      document.removeEventListener('mousedown', click);
    };
  }, [open]);

  function toggle() {
    if (open) return setOpen(false);
    const r = btnRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 4, left: Math.max(8, r.right - 168) });
    setOpen(true);
  }

  const opciones = ESTADOS.filter((s) => s !== actual);
  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
      >
        Cambiar <ChevronDown size={13} />
      </button>
      {open && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: 168 }}
          className="z-50 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {opciones.map((s) => (
            <button
              key={s}
              onClick={() => { setOpen(false); onChange(s); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <span className={`h-2 w-2 rounded-full ${dotEstado[s]}`} /> {labelEstado[s]}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
const vacio = { pacienteId: '', doctorId: '', fecha: '', fechaHora: '', motivo: '', tipo: 'primera_vez', observaciones: '' };

const fmt = (iso) =>
  new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short', timeZone: APP_TIME_ZONE });

/**
 * Página de gestión de citas (recepción/admin): agenda nuevas citas, filtra por
 * estado/fecha/doctor, edita, cambia estado y cancela.
 * @returns {JSX.Element}
 */
export default function Citas() {
  const pacientes = useFetch('/pacientes?limit=100');
  const doctores = useFetch('/doctores?limit=100');

  // Filtros + paginación (la API soporta page, limit, estado, doctorId, fecha)
  const [page, setPage] = useState(1);
  const [fEstado, setFEstado] = useState('');
  const [fDoctor, setFDoctor] = useState('');
  const [fFecha, setFFecha] = useState('');

  const qs = new URLSearchParams({ page: String(page), limit: '10' });
  if (fEstado) qs.set('estado', fEstado);
  if (fDoctor) qs.set('doctorId', fDoctor);
  if (fFecha) qs.set('fecha', fFecha);
  const { data, loading, error, reload } = useFetch(`/citas?${qs.toString()}`);

  const filtrar = (setter) => (v) => { setter(v); setPage(1); };
  const limpiarFiltros = () => { setFEstado(''); setFDoctor(''); setFFecha(''); setPage(1); };
  const hayFiltros = fEstado || fDoctor || fFecha;

  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(vacio);
  const [slots, setSlots] = useState(null);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [err, setErr] = useState('');
  const [guardando, setGuardando] = useState(false);
  const { user } = useAuth();
  const toast = useToast();

  // Reprogramar
  const [edit, setEdit] = useState(null);
  const [editForm, setEditForm] = useState({ fecha: '', fechaHora: '', motivo: '', tipo: 'control', observaciones: '' });
  const [editSlots, setEditSlots] = useState(null);
  const [editCargando, setEditCargando] = useState(false);
  const [editErr, setEditErr] = useState('');

  // Cancelar
  const [cancelando, setCancelando] = useState(null);
  const [motivoCancel, setMotivoCancel] = useState('');
  const [proc, setProc] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setEf = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));

  async function buscarSlots(doctorId, fecha) {
    setSlots(null);
    set('fechaHora', '');
    if (!doctorId || !fecha) return;
    setCargandoSlots(true);
    try {
      const res = await api.get(`/citas/disponibilidad/${doctorId}?fecha=${fecha}`);
      setSlots(res.slots || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setCargandoSlots(false);
    }
  }

  async function guardar(e) {
    e.preventDefault();
    setErr('');
    if (!form.fechaHora) { setErr('Selecciona un horario disponible.'); return; }
    setGuardando(true);
    try {
      await api.post('/citas', {
        pacienteId: form.pacienteId,
        doctorId: form.doctorId,
        fechaHora: form.fechaHora,
        motivo: form.motivo,
        tipo: form.tipo,
        observaciones: form.observaciones,
      });
      setAbierto(false);
      setForm(vacio);
      setSlots(null);
      toast.success('Cita agendada');
      reload();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(id, estado) {
    try {
      await api.put(`/citas/${id}/estado`, { estado });
      toast.success(`Cita ${labelEstado[estado]?.toLowerCase() || estado}`);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  function abrirEditar(c) {
    const fecha = fechaCalendario(c.fechaHora);
    setEdit(c);
    setEditForm({ fecha, fechaHora: '', motivo: c.motivo || '', tipo: c.tipo || 'control', observaciones: c.observaciones || '' });
    setEditErr('');
    buscarEditSlots(c.doctorId?._id || c.doctorId, fecha);
  }

  async function buscarEditSlots(doctorId, fecha) {
    setEditSlots(null);
    if (!doctorId || !fecha) return;
    setEditCargando(true);
    try {
      const res = await api.get(`/citas/disponibilidad/${doctorId}?fecha=${fecha}`);
      setEditSlots(res.slots || []);
    } catch (e) {
      setEditErr(e.message);
    } finally {
      setEditCargando(false);
    }
  }

  async function guardarEditar(e) {
    e.preventDefault();
    setEditErr('');
    setProc(true);
    try {
      await api.put(`/citas/${edit._id}`, {
        fechaHora: editForm.fechaHora || edit.fechaHora,
        motivo: editForm.motivo,
        tipo: editForm.tipo,
        observaciones: editForm.observaciones,
      });
      setEdit(null);
      toast.success('Cita reprogramada');
      reload();
    } catch (e2) {
      setEditErr(e2.message);
    } finally {
      setProc(false);
    }
  }

  async function confirmarCancelar(e) {
    e.preventDefault();
    setProc(true);
    try {
      await api.put(`/citas/${cancelando._id}/estado`, {
        estado: 'cancelada',
        motivoCancelacion: motivoCancel,
        canceladoPor: user ? `${user.nombre} ${user.apellido}` : 'Staff',
      });
      setCancelando(null);
      setMotivoCancel('');
      toast.success('Cita cancelada');
      reload();
    } catch (e2) {
      toast.error(e2.message);
    } finally {
      setProc(false);
    }
  }

  const lista = data?.citas || [];

  return (
    <>
      <PageHeader title="Citas" subtitle="Agenda médica de la clínica.">
        <Btn onClick={() => { setForm(vacio); setSlots(null); setErr(''); setAbierto(true); }}>
          <Plus size={16} /> Agendar cita
        </Btn>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Estado</label>
          <select className={inputCls + ' w-auto'} value={fEstado} onChange={(e) => filtrar(setFEstado)(e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS.map((s) => <option key={s} value={s}>{labelEstado[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Doctor</label>
          <select className={inputCls + ' w-auto'} value={fDoctor} onChange={(e) => filtrar(setFDoctor)(e.target.value)}>
            <option value="">Todos</option>
            {(doctores.data?.doctores || []).map((d) => (
              <option key={d._id} value={d._id}>Dr(a). {d.usuarioId?.nombre} {d.usuarioId?.apellido}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Fecha</label>
          <input type="date" className={inputCls + ' w-auto'} value={fFecha} onChange={(e) => filtrar(setFFecha)(e.target.value)} />
        </div>
        {hayFiltros && <Btn variant="ghost" onClick={limpiarFiltros}>Limpiar</Btn>}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : lista.length === 0 ? (
        <Card><Empty>{hayFiltros ? 'No hay citas con esos filtros.' : 'No hay citas agendadas.'}</Empty></Card>
      ) : (
        <>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Paciente</th>
                <th className="px-5 py-3 font-medium">Doctor</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-700">{fmt(c.fechaHora)}</td>
                  <td className="px-5 py-3 text-slate-700">
                    {c.pacienteId?.usuarioId?.nombre} {c.pacienteId?.usuarioId?.apellido}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {c.doctorId?.usuarioId ? `Dr(a). ${c.doctorId.usuarioId.nombre} ${c.doctorId.usuarioId.apellido}` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <Badge color={estadoColor[c.estado] || 'slate'}>{labelEstado[c.estado] || c.estado}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <CambiarEstado actual={c.estado} onChange={(s) => cambiarEstado(c._id, s)} />
                      {(c.estado === 'pendiente' || c.estado === 'confirmada') && (
                        <>
                          <button onClick={() => abrirEditar(c)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50">
                            <Pencil size={13} /> Editar
                          </button>
                          <button onClick={() => { setCancelando(c); setMotivoCancel(''); }} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50">
                            <Ban size={13} /> Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        {data?.totalPaginas > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-slate-500">Página {data.pagina} de {data.totalPaginas} · {data.total} citas</span>
            <div className="flex gap-2">
              <Btn variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Btn>
              <Btn variant="ghost" disabled={page >= data.totalPaginas} onClick={() => setPage((p) => p + 1)}>Siguiente</Btn>
            </div>
          </div>
        )}
        </>
      )}

      <Modal open={abierto} onClose={() => setAbierto(false)} title="Agendar cita">
        <form onSubmit={guardar} className="space-y-4">
          <ErrorMsg>{err}</ErrorMsg>
          <Field label="Paciente">
            <select className={inputCls} value={form.pacienteId} onChange={(e) => set('pacienteId', e.target.value)} required>
              <option value="">Selecciona…</option>
              {(pacientes.data?.pacientes || []).map((p) => (
                <option key={p._id} value={p._id}>{p.usuarioId?.nombre} {p.usuarioId?.apellido} · {p.rut}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Doctor">
              <select
                className={inputCls}
                value={form.doctorId}
                onChange={(e) => { set('doctorId', e.target.value); buscarSlots(e.target.value, form.fecha); }}
                required
              >
                <option value="">Selecciona…</option>
                {(doctores.data?.doctores || []).map((d) => (
                  <option key={d._id} value={d._id}>Dr(a). {d.usuarioId?.nombre} {d.usuarioId?.apellido}</option>
                ))}
              </select>
            </Field>
            <Field label="Fecha">
              <input
                type="date"
                className={inputCls}
                value={form.fecha}
                onChange={(e) => { set('fecha', e.target.value); buscarSlots(form.doctorId, e.target.value); }}
                required
              />
            </Field>
          </div>

          {form.doctorId && form.fecha && (
            <Field label="Horarios disponibles">
              {cargandoSlots ? (
                <p className="text-sm text-slate-400">Buscando horarios…</p>
              ) : slots && slots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((s) => (
                    <button
                      type="button"
                      key={s.fechaHora}
                      disabled={!s.disponible}
                      onClick={() => set('fechaHora', s.fechaHora)}
                      className={
                        'rounded-lg py-2 text-sm font-medium transition ' +
                        (!s.disponible
                          ? 'cursor-not-allowed border border-slate-200 text-slate-300 line-through'
                          : form.fechaHora === s.fechaHora
                          ? 'bg-brand-600 text-white'
                          : 'bg-brand-50 text-brand-700 hover:bg-brand-100')
                      }
                    >
                      {s.hora}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-sm text-slate-400">
                  <CalendarClock size={15} /> Sin horarios para ese día.
                </p>
              )}
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select className={inputCls} value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                <option value="primera_vez">Primera vez</option>
                <option value="control">Control</option>
                <option value="urgencia">Urgencia</option>
              </select>
            </Field>
            <Field label="Motivo">
              <input className={inputCls} value={form.motivo} onChange={(e) => set('motivo', e.target.value)} minLength={5} required />
            </Field>
          </div>
          <Field label="Observaciones">
            <textarea className={inputCls} rows={2} value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Btn>
            <Btn type="submit" disabled={guardando}>{guardando ? 'Agendando…' : 'Agendar'}</Btn>
          </div>
        </form>
      </Modal>

      {/* Reprogramar */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Reprogramar cita">
        {edit && (
          <form onSubmit={guardarEditar} className="space-y-4">
            <ErrorMsg>{editErr}</ErrorMsg>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {edit.pacienteId?.usuarioId?.nombre} {edit.pacienteId?.usuarioId?.apellido}
              {edit.doctorId?.usuarioId ? ` · Dr(a). ${edit.doctorId.usuarioId.nombre} ${edit.doctorId.usuarioId.apellido}` : ''}
            </p>
            <Field label="Nueva fecha">
              <input
                type="date"
                className={inputCls}
                value={editForm.fecha}
                onChange={(e) => { setEf('fecha', e.target.value); setEf('fechaHora', ''); buscarEditSlots(edit.doctorId?._id || edit.doctorId, e.target.value); }}
                required
              />
            </Field>
            <Field label="Horario">
              {editCargando ? (
                <p className="text-sm text-slate-400">Buscando horarios…</p>
              ) : editSlots && editSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {editSlots.map((s) => (
                    <button
                      type="button"
                      key={s.fechaHora}
                      disabled={!s.disponible}
                      onClick={() => setEf('fechaHora', s.fechaHora)}
                      className={
                        'rounded-lg py-2 text-sm font-medium transition ' +
                        (!s.disponible
                          ? 'cursor-not-allowed border border-slate-200 text-slate-300 line-through'
                          : editForm.fechaHora === s.fechaHora
                          ? 'bg-brand-600 text-white'
                          : 'bg-brand-50 text-brand-700 hover:bg-brand-100')
                      }
                    >
                      {s.hora}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Sin horarios ese día. Si no eliges otro, se mantiene la hora actual.</p>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select className={inputCls} value={editForm.tipo} onChange={(e) => setEf('tipo', e.target.value)}>
                  <option value="primera_vez">Primera vez</option>
                  <option value="control">Control</option>
                  <option value="urgencia">Urgencia</option>
                </select>
              </Field>
              <Field label="Motivo">
                <input className={inputCls} value={editForm.motivo} onChange={(e) => setEf('motivo', e.target.value)} minLength={5} required />
              </Field>
            </div>
            <Field label="Observaciones">
              <textarea className={inputCls} rows={2} value={editForm.observaciones} onChange={(e) => setEf('observaciones', e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="ghost" onClick={() => setEdit(null)}>Cerrar</Btn>
              <Btn type="submit" disabled={proc}>{proc ? 'Guardando…' : 'Guardar cambios'}</Btn>
            </div>
          </form>
        )}
      </Modal>

      {/* Cancelar */}
      <Modal open={!!cancelando} onClose={() => setCancelando(null)} title="Cancelar cita">
        {cancelando && (
          <form onSubmit={confirmarCancelar} className="space-y-4">
            <p className="text-sm text-slate-600">
              ¿Confirmas la cancelación de la cita de{' '}
              <span className="font-medium text-slate-800">{cancelando.pacienteId?.usuarioId?.nombre} {cancelando.pacienteId?.usuarioId?.apellido}</span>{' '}
              del {fmt(cancelando.fechaHora)}?
            </p>
            <Field label="Motivo de cancelación">
              <textarea className={inputCls} rows={3} value={motivoCancel} onChange={(e) => setMotivoCancel(e.target.value)} placeholder="Opcional" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="ghost" onClick={() => setCancelando(null)}>Volver</Btn>
              <Btn type="submit" variant="danger" disabled={proc}>{proc ? 'Cancelando…' : 'Cancelar cita'}</Btn>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
