import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  Activity, LayoutDashboard, CalendarDays, Users, Stethoscope,
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
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {items.map((m) => {
        const Ico = iconos[m.icon];
        return (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.exact}
            onClick={() => setAbierto(false)}
            className={({ isActive }) =>
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ' +
              (isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50')
            }
          >
            {Ico && <Ico size={18} />} {m.label}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar de escritorio */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <Link to="/" className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Activity size={20} strokeWidth={2.4} />
          </span>
          <span className="text-lg font-semibold text-slate-900">Medical</span>
        </Link>
        {nav}
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate text-sm font-medium text-slate-700">{info.label}</span>
            </span>
            <button onClick={salir} title="Cerrar sesión" aria-label="Cerrar sesión" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-red-500 ring-1 ring-slate-200 transition hover:bg-red-50 hover:text-red-600 hover:ring-red-200">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Drawer móvil */}
      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-60 flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <span className="text-lg font-semibold text-slate-900">Medical</span>
              <button onClick={() => setAbierto(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            {nav}
            <div className="border-t border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <span className="truncate text-sm font-medium text-slate-700">{info.label}</span>
                </span>
                <button onClick={salir} title="Cerrar sesión" aria-label="Cerrar sesión" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-red-500 ring-1 ring-slate-200 transition hover:bg-red-50 hover:text-red-600 hover:ring-red-200">
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Contenido */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <button className="text-slate-600 lg:hidden" onClick={() => setAbierto(true)} aria-label="Abrir menú">
            <Menu size={22} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{user?.nombre} {user?.apellido}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <Link
              to="/portal/perfil"
              title="Mi perfil"
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-700 transition hover:bg-brand-200"
            >
              {user?.foto
                ? <img src={user.foto} alt="" className="h-full w-full object-cover" />
                : (user?.nombre?.[0] || '') + (user?.apellido?.[0] || '')}
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
