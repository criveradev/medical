import { useState } from 'react';
import { Plus, Search, Pencil, Ban } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader, Card, Btn, Modal, Field, ErrorMsg, Spinner, Empty, Telefono, inputCls } from '../../components/ui';
import { formatearRut } from '../../lib/format';
import { useToast } from '../../context/ToastContext';

const vacio = {
  nombre: '', apellido: '', email: '', telefono: '', rut: '',
  fechaNacimiento: '', genero: 'masculino', direccion: '', prevision: 'fonasa',
};

/**
 * Página de administración de pacientes (CRUD): registra el usuario+ficha del
 * paciente (RUT como contraseña inicial) y permite editar sus datos.
 * @returns {JSX.Element}
 */
export default function Pacientes() {
  const toast = useToast();
  const [buscar, setBuscar] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const url = `/pacientes?page=${page}&limit=10${q ? `&buscar=${encodeURIComponent(q)}` : ''}`;
  const { data, loading, error, reload } = useFetch(url);

  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(vacio);
  const [err, setErr] = useState('');
  const [guardando, setGuardando] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function abrirNuevo() {
    setEditId(null);
    setForm(vacio);
    setErr('');
    setAbierto(true);
  }

  function abrirEditar(p) {
    setEditId(p._id);
    setForm({
      nombre: p.usuarioId?.nombre || '', apellido: p.usuarioId?.apellido || '',
      email: p.usuarioId?.email || '', telefono: p.usuarioId?.telefono || '',
      rut: formatearRut(p.rut || ''), fechaNacimiento: '', genero: p.genero || 'masculino',
      direccion: p.direccion || '', prevision: p.prevision || 'fonasa',
    });
    setErr('');
    setAbierto(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setErr('');
    setGuardando(true);
    try {
      if (editId) {
        await api.put(`/pacientes/${editId}`, {
          nombre: form.nombre, apellido: form.apellido, telefono: form.telefono,
          direccion: form.direccion, prevision: form.prevision,
        });
      } else {
        await api.post('/pacientes', form);
      }
      setAbierto(false);
      setForm(vacio);
      toast.success(editId ? 'Paciente actualizado' : 'Paciente registrado');
      setEditId(null);
      reload();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setGuardando(false);
    }
  }

  async function desactivar(p) {
    if (!confirm(`¿Desactivar a ${p.usuarioId?.nombre} ${p.usuarioId?.apellido}?`)) return;
    try {
      await api.del(`/pacientes/${p._id}`);
      toast.success('Paciente desactivado');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const lista = data?.pacientes || [];

  return (
    <>
      <PageHeader title="Pacientes" subtitle="Registro de pacientes de la clínica.">
        <Btn onClick={abrirNuevo}>
          <Plus size={16} /> Nuevo paciente
        </Btn>
      </PageHeader>

      <form
        onSubmit={(e) => { e.preventDefault(); setQ(buscar.trim()); setPage(1); }}
        className="mb-4 flex max-w-md gap-2"
      >
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className={inputCls + ' pl-9'}
            placeholder="Buscar por nombre, correo o RUT…"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>
        <Btn variant="ghost" type="submit">Buscar</Btn>
      </form>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : lista.length === 0 ? (
        <Card><Empty>No se encontraron pacientes.</Empty></Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Paciente</th>
                  <th className="px-5 py-3 font-medium">RUT</th>
                  <th className="px-5 py-3 font-medium">Correo</th>
                  <th className="px-5 py-3 font-medium">Teléfono</th>
                  <th className="px-5 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {p.usuarioId?.nombre} {p.usuarioId?.apellido}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{formatearRut(p.rut)}</td>
                    <td className="px-5 py-3 text-slate-600">{p.usuarioId?.email}</td>
                    <td className="px-5 py-3 text-slate-600">{p.usuarioId?.telefono || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => abrirEditar(p)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50">
                          <Pencil size={13} /> Editar
                        </button>
                        <button onClick={() => desactivar(p)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50">
                          <Ban size={13} /> Desactivar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {data?.totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-slate-500">Página {data.pagina} de {data.totalPaginas} · {data.total} pacientes</span>
              <div className="flex gap-2">
                <Btn variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Btn>
                <Btn variant="ghost" disabled={page >= data.totalPaginas} onClick={() => setPage((p) => p + 1)}>Siguiente</Btn>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={abierto} onClose={() => setAbierto(false)} title={editId ? 'Editar paciente' : 'Nuevo paciente'}>
        <form onSubmit={guardar} className="space-y-4">
          <ErrorMsg>{err}</ErrorMsg>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre">
              <input className={inputCls} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required />
            </Field>
            <Field label="Apellido">
              <input className={inputCls} value={form.apellido} onChange={(e) => set('apellido', e.target.value)} required />
            </Field>
          </div>

          {editId ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="RUT">
                <input className={inputCls} value={form.rut} disabled readOnly />
              </Field>
              <Field label="Correo">
                <input className={inputCls} value={form.email} disabled readOnly />
              </Field>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="RUT" hint="Contraseña inicial = RUT sin puntos ni guion">
                  <input className={inputCls} value={form.rut} onChange={(e) => set('rut', formatearRut(e.target.value))} placeholder="12.345.678-9" maxLength={12} required />
                </Field>
                <Field label="Fecha de nacimiento">
                  <input type="date" className={inputCls} value={form.fechaNacimiento} onChange={(e) => set('fechaNacimiento', e.target.value)} required />
                </Field>
              </div>
              <Field label="Correo">
                <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} required />
              </Field>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono">
              <Telefono value={form.telefono} onChange={(v) => set('telefono', v)} />
            </Field>
            {editId ? (
              <Field label="Previsión">
                <select className={inputCls} value={form.prevision} onChange={(e) => set('prevision', e.target.value)}>
                  <option value="fonasa">Fonasa</option>
                  <option value="isapre">Isapre</option>
                  <option value="particular">Particular</option>
                  <option value="otro">Otro</option>
                </select>
              </Field>
            ) : (
              <Field label="Género">
                <select className={inputCls} value={form.genero} onChange={(e) => set('genero', e.target.value)}>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </Field>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!editId && (
              <Field label="Previsión">
                <select className={inputCls} value={form.prevision} onChange={(e) => set('prevision', e.target.value)}>
                  <option value="fonasa">Fonasa</option>
                  <option value="isapre">Isapre</option>
                  <option value="particular">Particular</option>
                  <option value="otro">Otro</option>
                </select>
              </Field>
            )}
            <Field label="Dirección">
              <input className={inputCls} value={form.direccion} onChange={(e) => set('direccion', e.target.value)} />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Btn>
            <Btn type="submit" disabled={guardando}>{guardando ? 'Guardando…' : editId ? 'Guardar cambios' : 'Registrar'}</Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}
