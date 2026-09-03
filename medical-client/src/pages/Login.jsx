import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PasswordInput } from '../components/ui';
import { clinica } from '../data/clinic';

/**
 * Página de inicio de sesión: valida credenciales contra la API y, si son
 * correctas, guarda la sesión y redirige al portal.
 * @returns {JSX.Element}
 */
export default function Login() {
  const { login, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const result = await login(email, password);
      if (result.mfaRequired) {
        setChallengeToken(result.challengeToken);
        return;
      }
      // Entrar al portal; el layout muestra el menú según el rol del usuario.
      navigate('/portal', { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión');
    } finally {
      setCargando(false);
    }
  }

  async function onMfaSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await verifyMfa(challengeToken, mfaCode.trim());
      navigate('/portal', { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo verificar el segundo factor');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-brand-600">
          <ArrowLeft size={16} /> Volver al inicio
        </Link>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Activity size={24} strokeWidth={2.4} />
            </span>
            <h1 className="mt-4 text-xl font-semibold text-slate-900">Bienvenido de vuelta</h1>
            <p className="mt-1 text-sm text-slate-500">Ingresa al portal de {clinica.nombre}</p>
          </div>

          {error && (
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={challengeToken ? onMfaSubmit : onSubmit} className="mt-6 space-y-4">
            {challengeToken ? (
              <div>
                <label htmlFor="mfa-code" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Código de autenticación o recuperación
                </label>
                <input
                  id="mfa-code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  autoComplete="one-time-code"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-center font-mono text-lg tracking-widest outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            ) : <>
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">Correo</label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  id="login-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
              <PasswordInput
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                leftIcon={<Lock size={16} />}
              />
            </div>
            </>}

            <button
              type="submit"
              disabled={cargando}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {cargando ? <Loader2 size={18} className="animate-spin" /> : null}
              {cargando ? 'Verificando…' : challengeToken ? 'Verificar código' : 'Iniciar sesión'}
            </button>
            {challengeToken && (
              <button
                type="button"
                onClick={() => { setChallengeToken(''); setMfaCode(''); setError(''); }}
                className="w-full text-sm text-slate-500 hover:text-slate-700"
              >
                Volver a ingresar credenciales
              </button>
            )}
          </form>

          <p className="mt-5 rounded-lg bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-500">
            Demo: <span className="font-medium text-slate-700">admin@medical.com</span> / <span className="font-medium text-slate-700">Admin1234</span>
          </p>
        </div>
      </div>
    </div>
  );
}
