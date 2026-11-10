import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import FlujoPublico, { botonPublico, campoPublico } from '../components/FlujoPublico';
import { Btn, ErrorMsg, PasswordInput } from '../components/ui';
import { api } from '../lib/api';

export default function ActivarCuenta() {
  const { hash } = useLocation();
  const [token, setToken] = useState(() => new URLSearchParams(hash.slice(1)).get('token'));
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [activada, setActivada] = useState(false);
  const tokenValido = /^[a-f0-9]{24}\.[A-Za-z0-9_-]{43}$/.test(token ?? '');

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
  }, []);

  async function activar(e) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const password = datos.get('password');
    if (password !== datos.get('confirmacion')) {
      setError('Las contraseñas deben coincidir.');
      return;
    }
    setError('');
    setEnviando(true);
    try {
      await api.post('/registro/activacion', { token, password });
      setToken(null);
      setActivada(true);
    } catch (errorActivacion) {
      setError(errorActivacion.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <FlujoPublico seccion="Portal de pacientes" titulo={activada ? 'Cuenta activada' : 'Activa tu cuenta'}
      descripcion={activada ? 'Ya puedes ingresar con el correo de la invitación y tu nueva contraseña.' : 'Elige la contraseña que usarás para ingresar a Medical.'}
      mensaje="Tu acceso al portal" detalle="La invitación es personal y solo puede usarse una vez."
      volverA="/login" volverTexto="Ir a iniciar sesión">
      {activada ? (
        <Link to="/login" className="font-semibold text-brand-700 underline">Iniciar sesión</Link>
      ) : !tokenValido ? (
        <ErrorMsg>Abre el enlace del correo de invitación. Si el problema persiste, solicita un reenvío a quien registró tu ficha.</ErrorMsg>
      ) : (
        <form onSubmit={activar} className="space-y-4">
          <label htmlFor="activacion-password" className="block text-sm font-medium text-slate-700">
            Nueva contraseña
            <PasswordInput id="activacion-password" name="password" className={`${campoPublico} pr-10`}
              autoComplete="new-password" minLength={10} required />
          </label>
          <label htmlFor="activacion-confirmacion" className="block text-sm font-medium text-slate-700">
            Confirma la contraseña
            <PasswordInput id="activacion-confirmacion" name="confirmacion" className={`${campoPublico} pr-10`}
              autoComplete="new-password" minLength={10} required />
          </label>
          <p className="text-sm text-slate-600">Usa al menos 10 caracteres y una contraseña diferente de tu RUT.</p>
          <ErrorMsg>{error}</ErrorMsg>
          <Btn type="submit" className={botonPublico} disabled={enviando}>
            {enviando ? 'Activando…' : 'Activar cuenta'}
          </Btn>
        </form>
      )}
    </FlujoPublico>
  );
}
