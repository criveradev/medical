import { useState } from 'react';
import { Upload, FlaskConical, Download, Pencil, FileText } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFetch } from '../../../hooks/useFetch';
import { useMiDoctor } from '../../../hooks/useMiDoctor';
import { useToast } from '../../../context/ToastContext';
import { PageHeader, Card, Btn, Modal, Field, ErrorMsg, Spinner, Empty, Badge, inputCls } from '../../../components/ui';
import { APP_TIME_ZONE } from '../../../lib/format';

const TIPOS = [
  ['examen_sangre', 'Examen de sangre'], ['radiografia', 'Radiografía'], ['ecografia', 'Ecografía'],
  ['electrocardiograma', 'Electrocardiograma'], ['otro', 'Otro'],
];
const tipoLabel = Object.fromEntries(TIPOS);
const fmt = (iso) => new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short', timeZone: APP_TIME_ZONE });
const fmtFecha = (iso) => new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: APP_TIME_ZONE });

/**
 * Lista los resultados ya cargados de un paciente (con opción de eliminar).
 * @param {{pacienteId: string}} props - ID del paciente.
 * @returns {JSX.Element}
 */
function ListaResultados({ pacienteId }) {
  const { data, loading, error, reload } = useFetch(`/resultados/paciente/${pacienteId}`);
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ tipo: 'examen_sangre', nombre: '', descripcion: '' });
  const [guardando, setGuardando] = useState(false);

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

  function abrirEditar(r) {
    setEdit(r);
    setForm({ tipo: r.tipo || 'examen_sangre', nombre: r.nombre || '', descripcion: r.descripcion || '' });
  }
  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.put(`/resultados/${edit._id}`, form);
      setEdit(null);
      toast.success('Resultado actualizado');
      reload();
    } catch (e2) {
      toast.error(e2.message);
    } finally {
      setGuardando(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg>{error}</ErrorMsg>;
  const items = data?.resultados || [];
  if (!items.length) return <Card><Empty>Este paciente no tiene resultados aún.</Empty></Card>;

  return (
    <>
      <div className="space-y-2">
        {items.map((r) => (
          <Card key={r._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <FlaskConical size={18} />
              </span>
              <div>
                <p className="flex items-center gap-2 font-medium text-slate-900">{r.nombre} <Badge color="brand">{tipoLabel[r.tipo] || r.tipo}</Badge></p>
                <p className="text-xs text-slate-400">{fmtFecha(r.fecha || r.createdAt)}{r.descripcion ? ` · ${r.descripcion}` : ''}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {r.tieneArchivo ? (
                <button type="button" onClick={() => descargar(r._id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50">
                  <Download size={13} /> Archivo
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-400"><FileText size={13} /> Sin archivo</span>
              )}
              <button onClick={() => abrirEditar(r)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50">
                <Pencil size={13} /> Editar
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Editar resultado">
        {edit && (
          <form onSubmit={guardar} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select className={inputCls} value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Nombre">
                <input className={inputCls} value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} required />
              </Field>
            </div>
            <Field label="Descripción">
              <textarea className={inputCls} rows={2} value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="ghost" onClick={() => setEdit(null)}>Cancelar</Btn>
              <Btn type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Btn>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

/**
 * Formulario para subir un resultado médico (selección de paciente/cita,
 * metadatos y archivo) a nombre del doctor.
 * @param {{doctorId: string}} props - ID del doctor que sube el resultado.
 * @returns {JSX.Element}
 */
function Form({ doctorId }) {
  const { data } = useFetch(`/citas?doctorId=${doctorId}&limit=100`);
  const citas = data?.citas || [];
  const toast = useToast();

  const [citaId, setCitaId] = useState('');
  const [tipo, setTipo] = useState('examen_sangre');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [err, setErr] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [version, setVersion] = useState(0);

  const cita = citas.find((c) => c._id === citaId);
  const pacienteId = cita ? (cita.pacienteId?._id || cita.pacienteId) : '';

  async function enviar(e) {
    e.preventDefault();
    setErr('');
    if (!cita) { setErr('Selecciona una cita.'); return; }
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append('pacienteId', pacienteId);
      fd.append('citaId', citaId);
      fd.append('doctorId', doctorId);
      fd.append('tipo', tipo);
      fd.append('nombre', nombre);
      fd.append('descripcion', descripcion);
      if (archivo) fd.append('archivo', archivo);
      await api.upload('/resultados', fd);
      toast.success('Resultado subido');
      setNombre(''); setDescripcion(''); setArchivo(null);
      setVersion((v) => v + 1);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-xl p-6">
        <form onSubmit={enviar} className="space-y-4">
          <ErrorMsg>{err}</ErrorMsg>
          <Field label="Cita / paciente">
            <select className={inputCls} value={citaId} onChange={(e) => setCitaId(e.target.value)} required>
              <option value="">Selecciona…</option>
              {citas.map((c) => (
                <option key={c._id} value={c._id}>
                  {fmt(c.fechaHora)} · {c.pacienteId?.usuarioId?.nombre} {c.pacienteId?.usuarioId?.apellido}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Nombre del examen">
              <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Hemograma completo" required />
            </Field>
          </div>
          <Field label="Descripción">
            <textarea className={inputCls} rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </Field>
          <Field label="Archivo (PDF o imagen)" hint="Opcional, máx. 5 MB">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
          </Field>
          <div className="pt-2">
            <Btn type="submit" disabled={subiendo}>
              <Upload size={16} /> {subiendo ? 'Subiendo…' : 'Subir resultado'}
            </Btn>
          </div>
        </form>
      </Card>

      {pacienteId && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Resultados del paciente</h2>
          <ListaResultados key={`${pacienteId}-${version}`} pacienteId={pacienteId} />
        </div>
      )}
    </div>
  );
}

/**
 * Página "Resultados" del doctor: resuelve su doctorId y muestra el formulario
 * para subir resultados.
 * @returns {JSX.Element}
 */
export default function SubirResultado() {
  const { doctorId, loading, error } = useMiDoctor();
  return (
    <>
      <PageHeader title="Resultados" subtitle="Sube exámenes y revisa los del paciente." />
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : !doctorId ? (
        <Card><Empty>No tienes un perfil de doctor asociado.</Empty></Card>
      ) : (
        <Form doctorId={doctorId} />
      )}
    </>
  );
}
