import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Btn, ErrorMsg, PasswordInput } from '../components/ui';
import FlujoPublico, { botonPublico, campoPublico } from '../components/FlujoPublico';

/**
 * Página de inicio de sesión: valida credenciales contra la API y, si son
 * correctas, guarda la sesión y redirige al portal.
 * @returns {JSX.Element}
 */
export default function Login() {
  const { login, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const agenda = useLocation().state?.agenda;
  const destino = typeof agenda === 'string' && /^\/agendar(?:\?|$)/.test(agenda) ? agenda : '/portal';
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
      navigate(destino, { replace: true });
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
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo verificar el segundo factor');
    } finally {
      setCargando(false);
    }
  }

  return (
    <FlujoPublico
      seccion="Portal de pacientes"
      titulo={challengeToken ? 'Verifica tu identidad' : 'Iniciar sesión'}
      descripcion={challengeToken ? 'Ingresa el código de tu aplicación de autenticación o un código de recuperación.' : 'Ingresa tu correo y contraseña para acceder a tu cuenta.'}
      mensaje="Bienvenido a Medical"
      detalle={destino !== '/portal' ? 'Al iniciar sesión, volverás al horario que seleccionaste.' : 'Consulta tus citas, historial y resultados desde tu cuenta.'}
      volverA={destino !== '/portal' ? destino : '/'}
      volverTexto={destino !== '/portal' ? 'Volver a la agenda' : 'Volver al inicio'}
      lateral={
        <p className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-sm font-medium text-brand-100">
          <ShieldCheck size={17} aria-hidden="true" /> Acceso a tu cuenta
        </p>
      }
    >
      <form onSubmit={challengeToken ? onMfaSubmit : onSubmit} className="space-y-5 text-sm">
        {challengeToken ? (
          <div>
            <label htmlFor="mfa-code" className="font-medium text-slate-700">
              Código de autenticación o recuperación
            </label>
            <input id="mfa-code" value={mfaCode} onChange={e => setMfaCode(e.target.value)}
              autoComplete="one-time-code" required autoFocus
              className={`${campoPublico} text-center font-mono tracking-widest`} />
          </div>
        ) : <>
          <div>
            <label htmlFor="login-email" className="block font-medium text-slate-700">Correo</label>
            <div className="relative mt-2">
              <Mail size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-600" />
              <input type="email" id="login-email" required value={email}
                onChange={e => setEmail(e.target.value)} autoComplete="username"
                placeholder="tucorreo@ejemplo.com" className={`${campoPublico} mt-0 pl-10`} />
            </div>
          </div>
          <div>
            <label htmlFor="login-password" className="font-medium text-slate-700">Contraseña</label>
            <PasswordInput id="login-password" value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="current-password" leftIcon={<Lock size={17} aria-hidden="true" />}
              className={`${campoPublico} pr-10 pl-10`} />
          </div>
        </>}

        {error && <div role="alert"><ErrorMsg>{error}</ErrorMsg></div>}
        <Btn type="submit" disabled={cargando} className={botonPublico}>
          {cargando ? 'Verificando…' : challengeToken ? 'Verificar código' : 'Iniciar sesión'}
          {cargando ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />}
        </Btn>
        {challengeToken && (
          <button type="button" onClick={() => { setChallengeToken(''); setMfaCode(''); setError(''); }}
            className="min-h-11 w-full rounded-lg font-semibold text-brand-700 hover:bg-brand-50">
            Volver a ingresar credenciales
          </button>
        )}
      </form>

      {!challengeToken && (
        <div className="mt-5 space-y-4 border-t border-brand-100 pt-4 text-sm">
          <p className="text-slate-600">
            ¿Eres paciente nuevo?{' '}
            <Link to="/registro" state={destino === '/portal' ? undefined : { agenda: destino }}
              className="font-semibold text-brand-700 underline underline-offset-4">Crea tu cuenta</Link>
          </p>
          <details className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-slate-600">
            <summary className="cursor-pointer font-medium">Acceso de demostración</summary>
            <p className="mt-2 break-words">admin@medical.com / Admin1234</p>
          </details>
        </div>
      )}
    </FlujoPublico>
  );
}
