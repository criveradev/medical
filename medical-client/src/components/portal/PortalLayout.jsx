import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Users, Stethoscope,
  ListTree, Building2, UserCog, ClipboardList, FileText, FlaskConical, Wallet, Upload, User, LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { menuParaRol, rolInfo } from '../../lib/roles';
import NotificationBell from './NotificationBell';

const iconos = {
  LayoutDashboard, CalendarDays, Users, Stethoscope, ListTree, Building2, UserCog,
  ClipboardList, FileText, FlaskConical, Wallet, Upload, User,
};

/**
 * Layout del portal autenticado: barra lateral con el menú según el rol,
 * cabecera con notificaciones y el área de contenido (Outlet).
 * @returns {JSX.Element}
 */
export default function PortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);

  const items = menuParaRol(user?.rol);
  const info = rolInfo[user?.rol] || { label: user?.rol, color: 'slate' };

  async function salir() {
    await logout();
    navigate('/login', { replace: true });
  }

  const nav = (
    <nav aria-label="Navegación del portal" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {items.map((m) => {
        const Ico = iconos[m.icon];
        return (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.exact}
            onClick={() => setAbierto(false)}
            className={({ isActive }) =>
              'flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-white ' +
              (isActive ? 'bg-white text-brand-900' : 'text-brand-100 hover:bg-white/10 hover:text-white')
            }
          >
            {Ico && <Ico size={18} />} {m.label}
          </NavLink>
        );
      })}
    </nav>
  );

  const marca = (
    <Link to="/" onClick={() => setAbierto(false)} className="flex min-w-0 items-center gap-3 font-bold text-white">
      <img src="/favicon.svg" width="36" height="36" alt="" className="shrink-0" />
      <span className="text-lg">Medical</span>
    </Link>
  );

  const cuenta = (
    <div className="border-t border-white/15 p-3">
      <div className="flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs text-brand-200">Sesión activa</p>
          <p className="truncate text-sm font-semibold text-white">{info.label}</p>
        </div>
        <button onClick={salir} title="Cerrar sesión" aria-label="Cerrar sesión"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-50">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-linear-to-b from-brand-900 to-brand-800 lg:flex">
        <div className="border-b border-white/15 px-5 py-5">{marca}</div>
        {nav}
        {cuenta}
      </aside>

      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/55" onClick={() => setAbierto(false)} />
          <aside id="menu-portal-movil" className="absolute inset-y-0 left-0 flex w-64 max-w-full flex-col bg-linear-to-b from-brand-900 to-brand-800 shadow-xl">
            <div className="flex items-center justify-between gap-2 border-b border-white/15 px-4 py-3">
              {marca}
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar menú"
                className="grid size-11 place-items-center rounded-xl text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            {nav}
            {cuenta}
          </aside>
        </div>
      )}

      {/* Contenido */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-brand-100 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setAbierto(true)} aria-label="Abrir menú" aria-expanded={abierto}
            aria-controls={abierto ? 'menu-portal-movil' : undefined}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-800 lg:hidden">
            <Menu size={22} aria-hidden="true" />
          </button>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <NotificationBell />
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-brand-900">{user?.nombre} {user?.apellido}</p>
              <p className="truncate text-xs text-slate-600">{user?.email}</p>
            </div>
            <Link
              to="/portal/perfil"
              title="Mi perfil" aria-label="Mi perfil"
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-700 transition hover:bg-brand-200"
            >
              {user?.foto
                ? <img src={user.foto} alt="" className="h-full w-full object-cover" />
                : (user?.nombre?.[0] || '') + (user?.apellido?.[0] || '')}
            </Link>
          </div>
        </header>

        <main className="portal-content mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
