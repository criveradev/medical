import { useState } from 'react';
import { Plus, Pencil, Ban, KeyRound, ShieldOff } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader, Card, Btn, Modal, Field, ErrorMsg, Spinner, Empty, Badge, PasswordInput, Telefono, inputCls } from '../../components/ui';
import { rolInfo } from '../../lib/roles';
import { useToast } from '../../context/ToastContext';

const roles = ['administrador', 'recepcionista', 'enfermero', 'doctor', 'paciente'];
const vacio = { nombre: '', apellido: '', email: '', password: '', rolNombre: 'recepcionista', telefono: '', activo: true };

/**
 * Página de administración de usuarios del sistema (CRUD): gestiona cuentas y
 * sus roles (administrador, recepcionista, enfermero…).
 * @returns {JSX.Element}
 */
export default function Usuarios() {
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch('/auth/usuarios');
  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(vacio);
  const [err, setErr] = useState('');
  const [guardando, setGuardando] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const esYoMismo = editId && user && String(editId) === String(user.id);

  function abrirNuevo() {
    setEditId(null);
    setForm(vacio);
    setErr('');
    setAbierto(true);
  }

  function abrirEditar(u) {
    setEditId(u._id);
    setForm({
      nombre: u.nombre || '', apellido: u.apellido || '', email: u.email || '',
      password: '', rolNombre: u.roleId?.nombre || 'recepcionista', telefono: u.telefono || '',
      activo: u.activo !== false,
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
        await api.put(`/auth/usuarios/${editId}`, {
          nombre: form.nombre, apellido: form.apellido, email: form.email,
          telefono: form.telefono, rolNombre: form.rolNombre, activo: form.activo,
        });
      } else {
        await api.post('/auth/usuarios', {
          nombre: form.nombre, apellido: form.apellido, email: form.email,
          password: form.password, rolNombre: form.rolNombre, telefono: form.telefono,
        });
      }
      setAbierto(false);
      setForm(vacio);
      toast.success(editId ? 'Usuario actualizado' : 'Usuario creado');
      setEditId(null);
      reload();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setGuardando(false);
    }
  }

  async function desactivar(u) {
    if (!confirm(`¿Desactivar a ${u.nombre} ${u.apellido}?`)) return;
    try {
      await api.del(`/auth/usuarios/${u._id}`);
      toast.success('Usuario desactivado');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function revocarSesiones(u) {
    if (!confirm(`¿Revocar todas las sesiones de ${u.nombre} ${u.apellido}?`)) return;
    try {
      await api.post(`/auth/usuarios/${u._id}/revocar-sesiones`);
      toast.success('Sesiones revocadas');
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function restablecerMfa(u) {
    if (!confirm(`¿Restablecer el segundo factor de ${u.nombre} ${u.apellido}?`)) return;
    try {
      await api.del(`/auth/usuarios/${u._id}/mfa`);
      toast.success('Segundo factor restablecido');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const lista = data?.usuarios || [];

  return (
    <>
      <PageHeader title="Usuarios" subtitle="Cuentas del personal y pacientes del sistema.">
        <Btn onClick={abrirNuevo}>
          <Plus size={16} /> Nuevo usuario
        </Btn>
      </PageHeader>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : lista.length === 0 ? (
        <Card><Empty /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Correo</th>
                <th className="px-5 py-3 font-medium">Rol</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.map((u) => {
                const info = rolInfo[u.roleId?.nombre] || { label: u.roleId?.nombre, color: 'slate' };
                const yo = user && String(u._id) === String(user.id);
                return (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{u.nombre} {u.apellido}</td>
                    <td className="px-5 py-3 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3"><Badge color={info.color}>{info.label}</Badge></td>
                    <td className="px-5 py-3">
                      {u.activo ? <Badge color="green">Activo</Badge> : <Badge color="red">Inactivo</Badge>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => abrirEditar(u)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50">
                          <Pencil size={13} /> Editar
                        </button>
                        {!yo && u.activo && (
                          <button onClick={() => revocarSesiones(u)} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-1 text-xs text-amber-700 transition hover:bg-amber-50">
                            <KeyRound size={13} /> Revocar sesiones
                          </button>
                        )}
                        {!yo && u.mfaEnabled && (
                          <button onClick={() => restablecerMfa(u)} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-1 text-xs text-amber-700 transition hover:bg-amber-50">
                            <ShieldOff size={13} /> Restablecer MFA
                          </button>
                        )}
                        {u.activo && !yo && (
                          <button onClick={() => desactivar(u)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50">
                            <Ban size={13} /> Desactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={abierto} onClose={() => setAbierto(false)} title={editId ? 'Editar usuario' : 'Nuevo usuario'}>
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
          <Field label="Correo">
            <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </Field>
          {editId ? (
            <Field label="Rol">
              <select className={inputCls} value={form.rolNombre} onChange={(e) => set('rolNombre', e.target.value)} disabled={esYoMismo}>
                {roles.map((r) => <option key={r} value={r}>{rolInfo[r]?.label || r}</option>)}
              </select>
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contraseña" hint="Mín. 8, con letra y número">
                <PasswordInput value={form.password} onChange={(e) => set('password', e.target.value)} required autoComplete="new-password" />
              </Field>
              <Field label="Rol">
                <select className={inputCls} value={form.rolNombre} onChange={(e) => set('rolNombre', e.target.value)}>
                  {roles.map((r) => <option key={r} value={r}>{rolInfo[r]?.label || r}</option>)}
                </select>
              </Field>
            </div>
          )}
          <Field label="Teléfono">
            <Telefono value={form.telefono} onChange={(v) => set('telefono', v)} />
          </Field>
          {editId && (
            <label className={'flex items-center gap-2 text-sm ' + (esYoMismo ? 'text-slate-400' : 'text-slate-700')}>
              <input type="checkbox" checked={form.activo} disabled={esYoMismo} onChange={(e) => set('activo', e.target.checked)} className="h-4 w-4" />
              Cuenta activa
            </label>
          )}
          {esYoMismo && <p className="text-xs text-slate-400">No puedes cambiar tu propio rol ni desactivar tu cuenta.</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Btn>
            <Btn type="submit" disabled={guardando}>{guardando ? 'Guardando…' : editId ? 'Guardar cambios' : 'Crear'}</Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}
