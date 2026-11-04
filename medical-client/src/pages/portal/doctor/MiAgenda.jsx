import { useState } from 'react';
import { ClipboardPlus, CheckCircle2, User, Pencil, Download } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFetch } from '../../../hooks/useFetch';
import { useMiDoctor } from '../../../hooks/useMiDoctor';
import { imprimirReceta } from '../../../lib/receta';
import { useToast } from '../../../context/ToastContext';
import { PageHeader, Card, Btn, Modal, Field, ErrorMsg, Spinner, Empty, Badge, inputCls } from '../../../components/ui';
import { APP_TIME_ZONE, estadoColor, fechaCalendario, labelEstado } from '../../../lib/format';

const hoy = () => fechaCalendario();
const hora = (iso) => new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: APP_TIME_ZONE });
const vacio = { diagnostico: '', tratamiento: '', receta: '', observaciones: '' };

/**
 * Agenda del doctor: lista sus citas, permite cambiar estado y registrar la
 * atención (historial/receta) de cada cita.
 * @param {{doctorId: string}} props - ID del doctor.
 * @returns {JSX.Element}
 */
function Agenda({ doctorId }) {
  const [fecha, setFecha] = useState(hoy());
  const { data, loading, error, reload } = useFetch(`/citas?doctorId=${doctorId}&fecha=${fecha}&limit=50`);
  const [sel, setSel] = useState(null);
  const [histId, setHistId] = useState(null);
  const [form, setForm] = useState(vacio);
  const [err, setErr] = useState('');
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function abrir(cita) {
    setSel(cita);
    setHistId(null);
    setForm(vacio);
    setErr('');
  }

  // Abre la atención ya registrada de una cita completada para editarla
  async function abrirEditar(cita) {
    setSel(cita);
    setHistId(null);
    setForm(vacio);
    setErr('');
    try {
      const pacienteId = cita.pacienteId?._id || cita.pacienteId;
      const r = await api.get(`/historial/paciente/${pacienteId}`);
      const reg = (r.historial || []).find((h) => String(h.citaId?._id || h.citaId) === String(cita._id));
      if (reg) {
        setHistId(reg._id);
        setForm({
          diagnostico: reg.diagnostico || '', tratamiento: reg.tratamiento || '',
          receta: reg.receta || '', observaciones: reg.observaciones || '',
        });
      }
    } catch (e) {
      setErr(e.message);
    }
  }

  async function descargarReceta(c) {
    try {
      const pacienteId = c.pacienteId?._id || c.pacienteId;
      const [hr, pr] = await Promise.all([
        api.get(`/historial/paciente/${pacienteId}`),
        api.get(`/pacientes/${pacienteId}`),
      ]);
      const reg = (hr.historial || []).find((h) => String(h.citaId?._id || h.citaId) === String(c._id));
      if (!reg || !reg.receta) { toast.info('Esta atención no tiene receta registrada.'); return; }
      const p = pr.paciente || {};
      imprimirReceta(reg, {
        nombre: `${p.usuarioId?.nombre || ''} ${p.usuarioId?.apellido || ''}`.trim(),
        rut: p.rut,
      });
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function registrar(e) {
    e.preventDefault();
    setErr('');
    setGuardando(true);
    try {
      if (histId) {
        await api.put(`/historial/${histId}`, { ...form });
      } else {
        await api.post('/historial', {
          pacienteId: sel.pacienteId?._id || sel.pacienteId,
          citaId: sel._id,
          doctorId,
          ...form,
        });
      }
      setSel(null);
      toast.success(histId ? 'Atención actualizada' : 'Atención registrada');
      reload();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setGuardando(false);
    }
  }

  const citas = data?.citas || [];

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-slate-600">Día:</label>
        <input type="date" className={inputCls + ' w-auto'} value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : citas.length === 0 ? (
        <Card><Empty>No tienes citas para este día.</Empty></Card>
      ) : (
        <div className="space-y-3">
          {citas.map((c) => {
            const completada = c.estado === 'completada';
            return (
              <Card key={c._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <span className="text-sm font-semibold leading-none">{hora(c.fechaHora)}</span>
                  </span>
                  <div>
                    <p className="flex items-center gap-1.5 font-medium text-slate-900">
                      <User size={15} className="text-slate-400" />
                      {c.pacienteId?.usuarioId?.nombre} {c.pacienteId?.usuarioId?.apellido}
                    </p>
                    {c.motivo && <p className="text-sm text-slate-500">{c.motivo}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={estadoColor[c.estado] || 'slate'}>{labelEstado[c.estado] || c.estado}</Badge>
                  {completada ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-sm text-green-600">
                        <CheckCircle2 size={16} /> Atendida
                      </span>
                      <Btn variant="ghost" onClick={() => descargarReceta(c)}>
                        <Download size={15} /> Receta
                      </Btn>
                      <Btn variant="ghost" onClick={() => abrirEditar(c)}>
                        <Pencil size={15} /> Editar
                      </Btn>
                    </div>
                  ) : (
                    <Btn variant="ghost" onClick={() => abrir(c)}>
                      <ClipboardPlus size={16} /> Registrar atención
                    </Btn>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!sel} onClose={() => setSel(null)} title={histId ? 'Editar atención' : 'Registrar atención'}>
        <form onSubmit={registrar} className="space-y-4">
          <ErrorMsg>{err}</ErrorMsg>
          {sel && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Paciente: <span className="font-medium text-slate-800">{sel.pacienteId?.usuarioId?.nombre} {sel.pacienteId?.usuarioId?.apellido}</span> · {hora(sel.fechaHora)}
            </p>
          )}
          <Field label="Diagnóstico">
            <textarea className={inputCls} rows={2} value={form.diagnostico} onChange={(e) => set('diagnostico', e.target.value)} required minLength={3} />
          </Field>
          <Field label="Tratamiento">
            <textarea className={inputCls} rows={2} value={form.tratamiento} onChange={(e) => set('tratamiento', e.target.value)} />
          </Field>
          <Field label="Receta" hint="Un medicamento por línea">
            <textarea className={inputCls} rows={5} value={form.receta} onChange={(e) => set('receta', e.target.value)} />
          </Field>
          <Field label="Observaciones">
            <input className={inputCls} value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="ghost" onClick={() => setSel(null)}>Cancelar</Btn>
            <Btn type="submit" disabled={guardando}>{guardando ? 'Guardando…' : histId ? 'Guardar cambios' : 'Registrar y completar'}</Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}

/**
 * Página "Mi agenda" del doctor: resuelve su doctorId y muestra su agenda.
 * @returns {JSX.Element}
 */
export default function MiAgenda() {
  const { doctorId, loading, error } = useMiDoctor();
  return (
    <>
      <PageHeader title="Mi agenda" subtitle="Tus citas y registro de atenciones." />
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : !doctorId ? (
        <Card><Empty>No tienes un perfil de doctor asociado.</Empty></Card>
      ) : (
        <Agenda doctorId={doctorId} />
      )}
    </>
  );
}
