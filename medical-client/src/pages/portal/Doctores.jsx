import { useState } from 'react';
import { Plus, Stethoscope, Pencil } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader, Card, Btn, Modal, Field, ErrorMsg, Spinner, Empty, Badge, inputCls } from '../../components/ui';
import { useToast } from '../../context/ToastContext';

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const vacio = {
  usuarioId: '', especialidadId: '', matricula: '', duracionConsulta: 30,
  dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], horaInicio: '09:00', horaFin: '17:00', activo: true,
};

/**
 * Página de administración de doctores (CRUD): crea el usuario+doctor, asigna
 * especialidad y matrícula, gestiona horarios y foto.
 * @returns {JSX.Element}
 */
export default function Doctores() {
  const toast = useToast();
  const usuarios = useFetch('/auth/usuarios');
  const especialidades = useFetch('/especialidades');

  const [page, setPage] = useState(1);
  const [fEsp, setFEsp] = useState('');
  const qs = new URLSearchParams({ page: String(page), limit: '10' });
  if (fEsp) qs.set('especialidadId', fEsp);
  const { data, loading, error, reload } = useFetch(`/doctores?${qs.toString()}`);

  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(vacio);
  const [err, setErr] = useState('');
  const [guardando, setGuardando] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleDia = (d) =>
    setForm((f) => ({ ...f, dias: f.dias.includes(d) ? f.dias.filter((x) => x !== d) : [...f.dias, d] }));

  async function abrirNuevo() {
    setEditId(null);
    setForm(vacio);
    setErr('');
    setAbierto(true);
    try {
      const r = await api.get('/doctores/siguiente-matricula');
      setForm((f) => ({ ...f, matricula: r.matricula }));
    } catch { /* se asigna igual al guardar */ }
  }

  function abrirEditar(d) {
    const dias = [...new Set((d.horarios || []).filter((h) => h.activo !== false).map((h) => h.dia))];
    const h0 = (d.horarios || [])[0] || {};
    setEditId(d._id);
    setForm({
      usuarioId: d.usuarioId?._id || '',
      usuarioNombre: `${d.usuarioId?.nombre || ''} ${d.usuarioId?.apellido || ''}`.trim(),
      especialidadId: d.especialidadId?._id || '',
      matricula: d.matricula || '',
      duracionConsulta: d.duracionConsulta || 30,
      dias: dias.length ? dias : ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
      horaInicio: h0.horaInicio || '09:00',
      horaFin: h0.horaFin || '17:00',
      activo: d.activo !== false,
    });
    setErr('');
    setAbierto(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setErr('');
    setGuardando(true);
    try {
      const horarios = form.dias.map((dia) => ({ dia, horaInicio: form.horaInicio, horaFin: form.horaFin, activo: true }));
      if (editId) {
        await api.put(`/doctores/${editId}`, {
          especialidadId: form.especialidadId,
          matricula: form.matricula,
          duracionConsulta: Number(form.duracionConsulta),
          horarios,
          activo: form.activo,
        });
      } else {
        await api.post('/doctores', {
          usuarioId: form.usuarioId,
          especialidadId: form.especialidadId,
          matricula: form.matricula,
          duracionConsulta: Number(form.duracionConsulta),
          horarios,
        });
      }
      setAbierto(false);
      setForm(vacio);
      toast.success(editId ? 'Doctor actualizado' : 'Doctor creado');
      setEditId(null);
      reload();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setGuardando(false);
    }
  }

  const lista = data?.doctores || [];
  const usuariosDoctor = (usuarios.data?.usuarios || []).filter((u) => u.roleId?.nombre === 'doctor');
  const listaEsp = especialidades.data?.especialidades || [];

  return (
    <>
      <PageHeader title="Doctores" subtitle="Profesionales, su especialidad y horarios de atención.">
        <Btn onClick={abrirNuevo}>
          <Plus size={16} /> Nuevo doctor
        </Btn>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Especialidad</label>
          <select className={inputCls + ' w-auto'} value={fEsp} onChange={(e) => { setFEsp(e.target.value); setPage(1); }}>
            <option value="">Todas</option>
            {listaEsp.map((es) => <option key={es._id} value={es._id}>{es.nombre}</option>)}
          </select>
        </div>
        {fEsp && <Btn variant="ghost" onClick={() => { setFEsp(''); setPage(1); }}>Limpiar</Btn>}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : lista.length === 0 ? (
        <Card><Empty>{fEsp ? 'No hay doctores con esa especialidad.' : 'No hay doctores registrados.'}</Empty></Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Doctor</th>
                  <th className="px-5 py-3 font-medium">Especialidad</th>
                  <th className="px-5 py-3 font-medium">Matrícula</th>
                  <th className="px-5 py-3 font-medium">Consulta</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">
                      <span className="flex items-center gap-2">
                        <Stethoscope size={15} className="text-brand-500" />
                        Dr(a). {d.usuarioId?.nombre} {d.usuarioId?.apellido}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {d.especialidadId?.nombre ? <Badge color="brand">{d.especialidadId.nombre}</Badge> : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{d.matricula}</td>
                    <td className="px-5 py-3 text-slate-600">{d.duracionConsulta} min</td>
                    <td className="px-5 py-3">
                      {d.activo === false ? <Badge color="red">Inactivo</Badge> : <Badge color="green">Activo</Badge>}
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => abrirEditar(d)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50">
                        <Pencil size={13} /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {data?.totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-slate-500">Página {data.pagina} de {data.totalPaginas} · {data.total} doctores</span>
              <div className="flex gap-2">
                <Btn variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Btn>
                <Btn variant="ghost" disabled={page >= data.totalPaginas} onClick={() => setPage((p) => p + 1)}>Siguiente</Btn>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={abierto} onClose={() => setAbierto(false)} title={editId ? 'Editar doctor' : 'Nuevo doctor'}>
        <form onSubmit={guardar} className="space-y-4">
          <ErrorMsg>{err}</ErrorMsg>
          {editId ? (
            <Field label="Doctor">
              <input className={inputCls} value={`Dr(a). ${form.usuarioNombre || ''}`} disabled readOnly />
            </Field>
          ) : (
            <Field label="Usuario (rol doctor)" hint="Si no aparece, créalo primero en Usuarios con rol doctor.">
              <select className={inputCls} value={form.usuarioId} onChange={(e) => set('usuarioId', e.target.value)} required>
                <option value="">Selecciona…</option>
                {usuariosDoctor.map((u) => (
                  <option key={u._id} value={u._id}>{u.nombre} {u.apellido} · {u.email}</option>
                ))}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Especialidad">
              <select className={inputCls} value={form.especialidadId} onChange={(e) => set('especialidadId', e.target.value)} required>
                <option value="">Selecciona…</option>
                {listaEsp.map((es) => <option key={es._id} value={es._id}>{es.nombre}</option>)}
              </select>
            </Field>
            <Field label="Matrícula / Registro" hint={editId ? 'Registro profesional' : 'Sugerida automáticamente; puedes editarla'}>
              <input className={inputCls} value={form.matricula} onChange={(e) => set('matricula', e.target.value)} placeholder="Ej: 123456" required />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Duración (min)">
              <input type="number" min="10" step="5" className={inputCls} value={form.duracionConsulta} onChange={(e) => set('duracionConsulta', e.target.value)} required />
            </Field>
            <Field label="Desde">
              <input type="time" className={inputCls} value={form.horaInicio} onChange={(e) => set('horaInicio', e.target.value)} required />
            </Field>
            <Field label="Hasta">
              <input type="time" className={inputCls} value={form.horaFin} onChange={(e) => set('horaFin', e.target.value)} required />
            </Field>
          </div>
          <Field label="Días de atención">
            <div className="flex flex-wrap gap-1.5">
              {DIAS.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleDia(d)}
                  className={
                    'rounded-lg border px-2.5 py-1 text-xs capitalize transition ' +
                    (form.dias.includes(d)
                      ? 'border-brand-300 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50')
                  }
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>
          {editId && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.activo} onChange={(e) => set('activo', e.target.checked)} className="h-4 w-4" />
              Doctor activo
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Btn>
            <Btn type="submit" disabled={guardando}>{guardando ? 'Guardando…' : editId ? 'Guardar cambios' : 'Crear'}</Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}
