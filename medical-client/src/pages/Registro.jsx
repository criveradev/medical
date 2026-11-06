import { useState } from 'react';
import { ArrowRight, Mail, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Btn, ErrorMsg, PasswordInput } from '../components/ui';
import FlujoPublico, { botonPublico, campoPublico, PasosPublicos } from '../components/FlujoPublico';

const pasos = ['Correo', 'Datos de la cuenta'];

export default function Registro() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function enviar(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      if (!codigoEnviado) {
        await api.post('/registro/codigo', { email });
        setCodigoEnviado(true);
        return;
      }

      const datos = Object.fromEntries(new FormData(e.currentTarget));
      await api.post('/registro', { ...datos, email });
      try {
        await login(email.trim().toLowerCase(), datos.password);
        const agenda = state?.agenda;
        navigate(typeof agenda === 'string' && /^\/agendar(?:\?|$)/.test(agenda) ? agenda : '/agendar', { replace: true });
      } catch {
        navigate('/login', { replace: true, state });
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <FlujoPublico
      seccion="Portal de pacientes"
      titulo="Registro de paciente"
      descripcion={codigoEnviado ? 'Verifica tu correo y completa los datos de tu cuenta.' : 'Ingresa tu correo electrónico para recibir un código de verificación.'}
      mensaje="Crea tu cuenta en Medical"
      detalle={state?.agenda ? 'Cuando termines el registro, volverás a la reserva que estabas preparando.' : 'Tu cuenta te permite reservar y consultar tus citas desde el portal.'}
      lateral={<PasosPublicos pasos={pasos} actual={codigoEnviado ? 1 : 0} />}
    >
      <form onSubmit={enviar} className="space-y-5 text-sm">
        <label className="block font-medium text-slate-700">Correo electrónico
          <input className={campoPublico} type="email" autoComplete="email" value={email} readOnly={codigoEnviado}
            placeholder="nombre@ejemplo.com" required onChange={e => setEmail(e.target.value)} />
        </label>

        {codigoEnviado && <>
          <div role="status" className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4 text-brand-900">
            <Mail size={20} className="mt-0.5 shrink-0 text-brand-700" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold">Código enviado</p>
              <p className="mt-1 break-all">Revisa el correo que enviamos a {email} e ingresa el código de seis dígitos.</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="block font-medium text-slate-700">Código de verificación
              <input className={`${campoPublico} block max-w-48 text-center font-mono tracking-[0.3em]`}
                name="codigo" inputMode="numeric" autoComplete="one-time-code"
                pattern="[0-9]{6}" maxLength={6} required />
            </label>
            <button type="button" disabled={guardando}
              className="min-h-11 rounded-md font-semibold text-brand-700 underline underline-offset-4 disabled:opacity-60"
              onClick={() => { setCodigoEnviado(false); setError(''); }}>
              Cambiar correo o pedir otro código
            </button>
          </div>

          <fieldset className="grid min-w-0 gap-4 border-t border-brand-100 pt-4 font-medium text-slate-700 sm:grid-cols-2">
            <legend className="pr-3 text-base font-semibold text-brand-900">Tus datos</legend>
            <label>Nombre<input className={campoPublico} name="nombre" autoComplete="given-name" required maxLength={100} /></label>
            <label>Apellido<input className={campoPublico} name="apellido" autoComplete="family-name" required maxLength={100} /></label>
            <label>RUT<input className={campoPublico} name="rut" placeholder="12.345.678-5" required /></label>
            <label>Fecha de nacimiento<input className={campoPublico} name="fechaNacimiento" type="date" required /></label>
            <label>Género
              <select className={campoPublico} name="genero" required defaultValue="">
                <option value="">Selecciona una opción</option>
                <option value="femenino">Femenino</option>
                <option value="masculino">Masculino</option>
                <option value="otro">Otro</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              <label htmlFor="registro-password">Contraseña</label>
              <PasswordInput id="registro-password" className={`${campoPublico} pr-10`} name="password"
                autoComplete="new-password" minLength={10} aria-describedby="registro-password-ayuda" required />
              <p id="registro-password-ayuda" className="mt-1 text-xs font-normal text-slate-600">Usa al menos 10 caracteres.</p>
            </div>
          </fieldset>
        </>}

        {error && <div role="alert"><ErrorMsg>{error}</ErrorMsg></div>}
        <Btn type="submit" className={botonPublico} disabled={guardando}>
          {guardando ? 'Procesando…' : codigoEnviado ? 'Crear cuenta' : 'Enviar código'}
          {!guardando && <ArrowRight size={16} aria-hidden="true" />}
        </Btn>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 pt-4 text-sm">
        <p className="inline-flex items-center gap-2 text-slate-600">
          <ShieldCheck size={17} aria-hidden="true" /> Verificación por correo
        </p>
        <Link to="/login" state={state} className="font-semibold text-brand-700 underline underline-offset-4">Ya tengo cuenta</Link>
      </div>
    </FlujoPublico>
  );
}
