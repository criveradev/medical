import { useState, useRef, useEffect } from 'react';
import { Bell, CalendarDays, Wallet, FlaskConical, FileText, Check } from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';

const iconoTipo = { cita: CalendarDays, pago: Wallet, resultado: FlaskConical, historial: FileText };
/** Formatea una fecha a hora local corta (HH:mm). @param {Date|string} d @returns {string} */
const hora = (d) => new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

/**
 * Campana de notificaciones del portal: muestra el contador de no leídas y un
 * panel con las notificaciones recibidas en tiempo real.
 * @returns {JSX.Element}
 */
export default function NotificationBell() {
  const { items, unread, markAllRead, clear } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const click = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, [open]);

  function toggle() {
    const abrir = !open;
    setOpen(abrir);
    if (abrir && unread) markAllRead();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label="Notificaciones"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-800">Notificaciones</span>
            {items.length > 0 && (
              <button onClick={clear} className="text-xs text-slate-400 transition hover:text-slate-600">Limpiar</button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-slate-400">
              <Check size={22} /> Sin notificaciones
            </div>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {items.map((n) => {
                const Ico = iconoTipo[n.tipo] || Bell;
                return (
                  <li key={n.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Ico size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700">{n.mensaje}</p>
                      <p className="text-xs text-slate-400">{hora(n.hora)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
