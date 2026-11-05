import { useState } from 'react';
import { Plus, Pencil, Ban } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader, Card, Btn, Modal, Field, ErrorMsg, Spinner, Empty, Badge, inputCls } from '../../components/ui';
import { useToast } from '../../context/ToastContext';

const vacio = { nombre: '', descripcion: '', departamentoId: '', activo: true };

/**
 * Página de administración de especialidades (CRUD), asociadas a un departamento.
 * @returns {JSX.Element}
 */
export default function Especialidades() {
  const toast = useToast();
  const deps = useFetch('/departamentos');
  const [fDep, setFDep] = useState('');
  const url = fDep ? `/especialidades/departamento/${fDep}` : '/especialidades';
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

  function abrirEditar(es) {
    setEditId(es._id);
    setForm({
      nombre: es.nombre || '', descripcion: es.descripcion || '',
      departamentoId: es.departamentoId?._id || '', activo: es.activo !== false,
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
        await api.put(`/especialidades/${editId}`, form);
      } else {
        await api.post('/especialidades', form);
      }
      setAbierto(false);
      setForm(vacio);
      toast.success(editId ? 'Especialidad actualizada' : 'Especialidad creada');
      setEditId(null);
      reload();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setGuardando(false);
    }
  }

  async function desactivar(es) {
    if (!confirm(`¿Desactivar la especialidad "${es.nombre}"?`)) return;
    try {
      await api.del(`/especialidades/${es._id}`);
      toast.success('Especialidad desactivada');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const lista = data?.especialidades || [];
  const departamentos = deps.data?.departamentos || [];

  return (
    <>
      <PageHeader title="Especialidades" subtitle="Áreas de atención que ofrece la clínica.">
        <Btn onClick={abrirNuevo}>
          <Plus size={16} /> Nueva
        </Btn>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Departamento</label>
          <select className={inputCls + ' w-auto'} value={fDep} onChange={(e) => setFDep(e.target.value)}>
            <option value="">Todos</option>
            {departamentos.map((d) => <option key={d._id} value={d._id}>{d.nombre}</option>)}
          </select>
        </div>
        {fDep && <Btn variant="ghost" onClick={() => setFDep('')}>Limpiar</Btn>}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : lista.length === 0 ? (
        <Card><Empty>{fDep ? 'No hay especialidades en ese departamento.' : 'No hay especialidades. Crea la primera.'}</Empty></Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Especialidad</th>
                <th className="px-5 py-3 font-medium">Departamento</th>
                <th className="px-5 py-3 font-medium">Descripción</th>
                <th className="px-5 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.map((e) => (
                <tr key={e._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{e.nombre}</td>
                  <td className="px-5 py-3">
                    {e.departamentoId?.nombre ? <Badge color="brand">{e.departamentoId.nombre}</Badge> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{e.descripcion || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => abrirEditar(e)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50">
                        <Pencil size={13} /> Editar
                      </button>
                      <button onClick={() => desactivar(e)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50">
                        <Ban size={13} /> Desactivar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={abierto} onClose={() => setAbierto(false)} title={editId ? 'Editar especialidad' : 'Nueva especialidad'}>
        <form onSubmit={guardar} className="space-y-4">
          <ErrorMsg>{err}</ErrorMsg>
          <Field label="Nombre">
            <input className={inputCls} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required />
          </Field>
          <Field label="Departamento">
            <select className={inputCls} value={form.departamentoId} onChange={(e) => set('departamentoId', e.target.value)} required>
              <option value="">Selecciona…</option>
              {departamentos.map((d) => (
                <option key={d._id} value={d._id}>{d.nombre}</option>
              ))}
            </select>
          </Field>
          <Field label="Descripción">
            <textarea className={inputCls} rows={3} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
          </Field>
          {editId && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.activo} onChange={(e) => set('activo', e.target.checked)} className="h-4 w-4" />
              Especialidad activa
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
