import { useState } from 'react';
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader, Card, Btn, Modal, Field, ErrorMsg, Spinner, Empty, inputCls } from '../../components/ui';
import { useToast } from '../../context/ToastContext';

const vacio = { nombre: '', descripcion: '' };

/**
 * Página de administración de departamentos (CRUD): listar, crear, editar y
 * eliminar departamentos de la clínica.
 * @returns {JSX.Element}
 */
export default function Departamentos() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/departamentos');
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

  function abrirEditar(d) {
    setEditId(d._id);
    setForm({ nombre: d.nombre || '', descripcion: d.descripcion || '' });
    setErr('');
    setAbierto(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setErr('');
    setGuardando(true);
    try {
      if (editId) {
        await api.put(`/departamentos/${editId}`, form);
      } else {
        await api.post('/departamentos', form);
      }
      setAbierto(false);
      setForm(vacio);
      toast.success(editId ? 'Departamento actualizado' : 'Departamento creado');
      setEditId(null);
      reload();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(d) {
    if (!confirm(`¿Desactivar el departamento "${d.nombre}"?`)) return;
    try {
      await api.del(`/departamentos/${d._id}`);
      toast.success('Departamento desactivado');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const lista = data?.departamentos || [];

  return (
    <>
      <PageHeader title="Departamentos" subtitle="Áreas en las que se agrupan las especialidades.">
        <Btn onClick={abrirNuevo}>
          <Plus size={16} /> Nuevo
        </Btn>
      </PageHeader>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : lista.length === 0 ? (
        <Card><Empty>No hay departamentos. Crea el primero.</Empty></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((d) => (
            <Card key={d._id} role="article" aria-label={`Departamento ${d.nombre}`} className="flex flex-col p-5">
              <div className="flex items-start justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Building2 size={18} />
                </span>
                <div className="flex gap-1">
                  <button onClick={() => abrirEditar(d)} aria-label="Editar" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => eliminar(d)} aria-label="Desactivar" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">{d.nombre}</h3>
              {d.descripcion && <p className="mt-1 text-sm text-slate-500">{d.descripcion}</p>}
            </Card>
          ))}
        </div>
      )}

      <Modal open={abierto} onClose={() => setAbierto(false)} title={editId ? 'Editar departamento' : 'Nuevo departamento'}>
        <form onSubmit={guardar} className="space-y-4">
          <ErrorMsg>{err}</ErrorMsg>
          <Field label="Nombre">
            <input className={inputCls} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required />
          </Field>
          <Field label="Descripción">
            <textarea className={inputCls} rows={3} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Btn>
            <Btn type="submit" disabled={guardando}>{guardando ? 'Guardando…' : editId ? 'Guardar cambios' : 'Crear'}</Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}
