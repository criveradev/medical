import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Menu, X, LogIn, LogOut, LayoutDashboard, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clinica } from '../data/clinic';

const enlaces = [
  { href: '#especialidades', texto: 'Especialidades' },
  { href: '#doctores', texto: 'Doctores' },
  { href: '#nosotros', texto: 'Nosotros' },
  { href: '#contacto', texto: 'Contacto' },
];

/**
 * Barra de navegación de la landing pública. Muestra enlaces de sección y el
 * acceso al portal (login) o, si hay sesión, el menú del usuario.
 * @returns {JSX.Element}
 */
export default function Navbar() {
  const [abierto, setAbierto] = useState(false);
  const { user, logout } = useAuth();
  const cuentaRef = useRef(null);

  useEffect(() => {
    function cerrarFuera(evento) {
      const cuenta = cuentaRef.current;
      if (cuenta && !cuenta.contains(evento.target)) cuenta.open = false;
    }
    document.addEventListener('pointerdown', cerrarFuera);
    return () => document.removeEventListener('pointerdown', cerrarFuera);
  }, []);

  function cerrarCuenta() {
    if (cuentaRef.current) cuentaRef.current.open = false;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" aria-label={clinica.nombre} className="flex shrink-0 items-center gap-2">
          <img src="/favicon.svg" width="36" height="36" alt="" className="shrink-0" />
          <span className={`text-lg font-bold text-brand-900 ${user ? 'hidden sm:inline' : ''}`}>{clinica.nombre}</span>
        </Link>

        <div className="hidden items-center gap-5 lg:flex">
          {enlaces.map((e) => (
            <a key={e.href} href={e.href} className="text-sm text-slate-600 transition hover:text-brand-600">
              {e.texto}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link to="/agendar" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-3 text-sm font-semibold text-white transition hover:bg-brand-800 sm:px-4">
            <CalendarPlus size={17} className="hidden sm:block" aria-hidden="true" /> Agendar cita
          </Link>
          {user ? (
            <details ref={cuentaRef} className="relative" onToggle={evento => {
              if (evento.currentTarget.open) setAbierto(false);
            }} onKeyDown={evento => {
              if (evento.key === 'Escape') {
                cerrarCuenta();
                evento.currentTarget.querySelector('summary').focus();
              }
            }}>
              <summary aria-label="Mi cuenta" className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-1.5 text-brand-800 transition hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 [&::-webkit-details-marker]:hidden lg:pr-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold">
                  {user.nombre ? (user.nombre[0] + (user.apellido?.[0] || '')).toUpperCase() : <User size={17} aria-hidden="true" />}
                </span>
                <span className="hidden max-w-28 truncate text-sm font-semibold lg:block">{user.nombre || 'Mi cuenta'}</span>
                <ChevronDown size={14} className="hidden lg:block" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 z-50 mt-3 w-56 rounded-2xl border border-brand-100 bg-white p-2 shadow-xl shadow-brand-900/10">
                <p className="truncate border-b border-brand-100 px-3 pt-2 pb-3 text-sm font-semibold text-brand-900">Mi cuenta</p>
                <Link to="/portal" onClick={cerrarCuenta} className="mt-1 flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-brand-900 hover:bg-brand-50">
                  <LayoutDashboard size={17} aria-hidden="true" /> Ir al portal
                </Link>
                <button type="button" onClick={() => { cerrarCuenta(); return logout(); }}
                  className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-slate-600 hover:bg-slate-50">
                  <LogOut size={17} aria-hidden="true" /> Cerrar sesión
                </button>
              </div>
            </details>
          ) : (
            <Link to="/login" className="hidden min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand-900 hover:bg-brand-50 lg:flex">
              <LogIn size={16} aria-hidden="true" /> Iniciar sesión
            </Link>
          )}
          <button type="button" className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-800 lg:hidden"
            onClick={() => { cerrarCuenta(); setAbierto(v => !v); }} aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={abierto} aria-controls={abierto ? 'menu-portada' : undefined}>
            {abierto ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {abierto && (
        <div id="menu-portada" className="border-t border-brand-100 bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-3">
            {enlaces.map((e) => (
              <a
                key={e.href}
                href={e.href}
                onClick={() => setAbierto(false)}
                className="text-sm text-slate-600"
              >
                {e.texto}
              </a>
            ))}
            {!user && (
              <Link to="/login" onClick={() => setAbierto(false)} className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand-700">
                <LogIn size={16} aria-hidden="true" /> Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
