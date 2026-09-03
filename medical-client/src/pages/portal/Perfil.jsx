import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, ShieldCheck, CheckCircle2, Camera, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Card, Btn, Field, ErrorMsg, Spinner, Badge, PasswordInput } from '../../components/ui';
import { rolInfo } from '../../lib/roles';

/**
 * Redimensiona una imagen en el navegador a un cuadrado de máx. `max` px (JPEG),
 * para que el avatar pese poco sin importar el tamaño original.
 * @param {File} file - Archivo de imagen original.
 * @param {number} [max=512] - Lado máximo en píxeles.
 * @returns {Promise<Blob>} Blob JPEG redimensionado.
 */
function redimensionar(file, max = 512) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > height && width > max) { height = Math.round((height * max) / width); width = max; }
      else if (height >= width && height > max) { width = Math.round((width * max) / height); height = max; }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen inválida')); };
    img.src = url;
  });
}

/**
 * Fila de dato del perfil con icono, etiqueta y valor.
 * @param {{icon: import('react').ComponentType, label: string, valor?: string}} props
 * @returns {JSX.Element}
 */
function Dato({ icon: Icon, label, valor }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={17} />
      </span>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800">{valor || '—'}</p>
      </div>
    </div>
  );
}

/**
 * Página de perfil del usuario autenticado: muestra sus datos, permite subir/
 * cambiar la foto de perfil y cerrar sesión.
 * @returns {JSX.Element}
 */
export default function Perfil() {
  const { logout, actualizarFoto, actualizarMfa } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error } = useFetch('/auth/perfil');

  const [foto, setFoto] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirma, setConfirma] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const [proc, setProc] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(null);
  const [mfaPassword, setMfaPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSetup, setMfaSetup] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState('');

  async function cambiar(e) {
    e.preventDefault();
    setErr('');
    if (nueva !== confirma) { setErr('Las contraseñas nuevas no coinciden.'); return; }
    if (nueva.length < 8 || !/[A-Za-z]/.test(nueva) || !/\d/.test(nueva)) {
      setErr('La nueva contraseña debe tener mínimo 8 caracteres, con letras y números.');
      return;
    }
    setProc(true);
    try {
      await api.put('/auth/cambiar-password', { passwordActual: actual, passwordNueva: nueva });
      setOk(true);
      // El backend invalida la sesión → cerrar y volver a entrar
      setTimeout(async () => {
        await logout();
        navigate('/login', { replace: true });
      }, 1500);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setProc(false);
    }
  }

  async function onFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoFoto(true);
    try {
      const blob = await redimensionar(file, 512);
      const fd = new FormData();
      fd.append('foto', blob, 'avatar.jpg');
      const res = await api.upload('/auth/perfil/foto', fd, 'PUT');
      setFoto(res.foto);
      actualizarFoto(res.foto);
      toast.success('Foto actualizada');
    } catch (e2) {
      toast.error(e2.message);
    } finally {
      setSubiendoFoto(false);
    }
  }

  async function iniciarMfa(e) {
    e.preventDefault();
    setMfaBusy(true);
    setMfaError('');
    try {
      setMfaSetup(await api.post('/auth/mfa/setup', { password: mfaPassword }));
      setMfaPassword('');
    } catch (error) {
      setMfaError(error.message);
    } finally {
      setMfaBusy(false);
    }
  }

  async function confirmarMfa(e) {
    e.preventDefault();
    setMfaBusy(true);
    setMfaError('');
    try {
      const response = await api.post('/auth/mfa/confirm', { code: mfaCode });
      setRecoveryCodes(response.recoveryCodes);
      setMfaEnabled(true);
      actualizarMfa(true);
      setMfaSetup(null);
      setMfaCode('');
    } catch (error) {
      setMfaError(error.message);
    } finally {
      setMfaBusy(false);
    }
  }

  async function deshabilitarMfa(e) {
    e.preventDefault();
    setMfaBusy(true);
    setMfaError('');
    try {
      await api.post('/auth/mfa/disable', { password: mfaPassword, code: mfaCode });
      actualizarMfa(false);
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      setMfaError(error.message);
    } finally {
      setMfaBusy(false);
    }
  }

  if (loading) return <><PageHeader title="Mi perfil" /><Spinner /></>;
  if (error) return <><PageHeader title="Mi perfil" /><ErrorMsg>{error}</ErrorMsg></>;

  const u = data?.usuario || {};
  const rol = data?.rol?.nombre || u.roleId?.nombre;
  const info = rolInfo[rol] || { label: rol, color: 'slate' };
  const iniciales = (u.nombre?.[0] || '') + (u.apellido?.[0] || '');
  const fotoActual = foto || u.foto;
  const segundoFactorActivo = mfaEnabled ?? Boolean(u.mfaEnabled);

  return (
    <>
      <PageHeader title="Mi perfil" subtitle="Tus datos y seguridad de la cuenta." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <label className="relative cursor-pointer" title="Cambiar foto">
              {fotoActual ? (
                <img src={fotoActual} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
                  {iniciales}
                </span>
              )}
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-white">
                {subiendoFoto ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={onFoto} disabled={subiendoFoto} />
            </label>
            <div>
              <p className="text-lg font-semibold text-slate-900">{u.nombre} {u.apellido}</p>
              <Badge color={info.color}>{info.label}</Badge>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-2">
            <Dato icon={Mail} label="Correo" valor={u.email} />
            <Dato icon={Phone} label="Teléfono" valor={u.telefono} />
            <Dato icon={ShieldCheck} label="Rol" valor={info.label} />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-slate-900">Cambiar contraseña</h2>
          <p className="mt-1 text-sm text-slate-500">Por seguridad, deberás iniciar sesión de nuevo al cambiarla.</p>

          {ok ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
              <CheckCircle2 size={16} /> Contraseña actualizada. Redirigiendo al inicio de sesión…
            </div>
          ) : (
            <form onSubmit={cambiar} className="mt-4 space-y-4">
              <ErrorMsg>{err}</ErrorMsg>
              <Field label="Contraseña actual">
                <PasswordInput value={actual} onChange={(e) => setActual(e.target.value)} required autoComplete="current-password" />
              </Field>
              <Field label="Nueva contraseña" hint="Mín. 8, con letras y números">
                <PasswordInput value={nueva} onChange={(e) => setNueva(e.target.value)} required autoComplete="new-password" />
              </Field>
              <Field label="Repetir nueva contraseña">
                <PasswordInput value={confirma} onChange={(e) => setConfirma(e.target.value)} required autoComplete="new-password" />
              </Field>
              <div className="flex justify-end pt-1">
                <Btn type="submit" disabled={proc}>{proc ? 'Guardando…' : 'Actualizar contraseña'}</Btn>
              </div>
            </form>
          )}
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Autenticación en dos pasos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Protege la cuenta con una aplicación compatible con códigos TOTP.
          </p>
          <ErrorMsg>{mfaError}</ErrorMsg>

          {recoveryCodes.length > 0 ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">Guarda estos códigos de recuperación una sola vez:</p>
              <div className="mt-3 grid gap-2 font-mono text-sm sm:grid-cols-2">
                {recoveryCodes.map((code) => <span key={code}>{code}</span>)}
              </div>
            </div>
          ) : mfaSetup ? (
            <form onSubmit={confirmarMfa} className="mt-4 grid gap-4 md:grid-cols-[240px_1fr]">
              <img src={mfaSetup.qrCode} alt="Código QR para configurar MFA" className="h-60 w-60" />
              <div>
                <p className="text-sm text-slate-600">Escanea el QR o introduce esta clave:</p>
                <code className="mt-2 block break-all rounded bg-slate-100 p-2 text-xs">{mfaSetup.secret}</code>
                <Field label="Código de seis dígitos">
                  <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} required inputMode="numeric" autoComplete="one-time-code" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </Field>
                <Btn type="submit" disabled={mfaBusy}>{mfaBusy ? 'Verificando…' : 'Confirmar activación'}</Btn>
              </div>
            </form>
          ) : segundoFactorActivo ? (
            <form onSubmit={deshabilitarMfa} className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Contraseña actual">
                <PasswordInput value={mfaPassword} onChange={(e) => setMfaPassword(e.target.value)} required autoComplete="current-password" />
              </Field>
              <Field label="Código de seis dígitos">
                <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} required inputMode="numeric" autoComplete="one-time-code" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
              </Field>
              <div className="md:col-span-2">
                <Btn type="submit" disabled={mfaBusy}>{mfaBusy ? 'Deshabilitando…' : 'Deshabilitar segundo factor'}</Btn>
              </div>
            </form>
          ) : (
            <form onSubmit={iniciarMfa} className="mt-4 max-w-md space-y-4">
              <Field label="Confirma tu contraseña actual">
                <PasswordInput value={mfaPassword} onChange={(e) => setMfaPassword(e.target.value)} required autoComplete="current-password" />
              </Field>
              <Btn type="submit" disabled={mfaBusy}>{mfaBusy ? 'Preparando…' : 'Configurar segundo factor'}</Btn>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
