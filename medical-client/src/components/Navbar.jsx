import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Menu, X, LogIn, LogOut, User } from 'lucide-react';
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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Activity size={20} strokeWidth={2.4} />
          </span>
          <span className="text-lg font-semibold text-slate-900">{clinica.nombre}</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {enlaces.map((e) => (
            <a key={e.href} href={e.href} className="text-sm text-slate-600 transition hover:text-brand-600">
              {e.texto}
            </a>
          ))}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm text-slate-700">
                <User size={16} /> {user.nombre}
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <LogOut size={16} /> Salir
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              <LogIn size={16} /> Iniciar sesión
            </Link>
          )}
        </div>

        <button
          className="text-slate-700 md:hidden"
          onClick={() => setAbierto((v) => !v)}
          aria-label="Abrir menú"
        >
          {abierto ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {abierto && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
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
            {user ? (
              <button onClick={logout} className="flex items-center gap-1.5 text-sm text-slate-700">
                <LogOut size={16} /> Cerrar sesión
              </button>
            ) : (
              <Link to="/login" className="flex items-center gap-1.5 text-sm font-medium text-brand-700">
                <LogIn size={16} /> Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
