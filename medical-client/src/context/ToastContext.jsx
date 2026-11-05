import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
let _id = 0;

const estilos = {
  success: { Icon: CheckCircle2, cls: 'border-green-200 bg-green-50 text-green-800', icon: 'text-green-600' },
  error: { Icon: AlertCircle, cls: 'border-red-200 bg-red-50 text-red-800', icon: 'text-red-600' },
  info: { Icon: Info, cls: 'border-slate-200 bg-white text-slate-800', icon: 'text-brand-600' },
};

/**
 * Renderiza un toast individual con su icono y estilo según el tipo.
 * @param {{t: {tipo: string, msg: string}, onClose: function(): void}} props
 * @returns {JSX.Element}
 */
function ToastItem({ t, onClose }) {
  const cfg = estilos[t.tipo] || estilos.info;
  const Icon = cfg.Icon;
  return (
    <div
      role={t.tipo === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg ${cfg.cls}`}
      style={{ minWidth: 260, maxWidth: 380 }}
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${cfg.icon}`} />
      <span className="flex-1">{t.msg}</span>
      <button onClick={onClose} className="shrink-0 opacity-60 transition hover:opacity-100" aria-label="Cerrar"><X size={15} /></button>
    </div>
  );
}

/**
 * Provider de notificaciones tipo toast. Expone success/error/info y renderiza
 * los toasts; cada uno se autodescarta a los 4 segundos.
 * @param {{children: import('react').ReactNode}} props
 * @returns {JSX.Element}
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  /** Elimina un toast por id. @param {number} id @returns {void} */
  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  /**
   * Encola un toast nuevo y programa su descarte.
   * @param {string} tipo - success | error | info.
   * @param {string} msg - Mensaje a mostrar.
   * @returns {void}
   */
  const push = useCallback((tipo, msg) => {
    const id = ++_id;
    setToasts((t) => [...t, { id, tipo, msg }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const api = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => <ToastItem key={t.id} t={t} onClose={() => remove(t.id)} />)}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook para mostrar toasts desde cualquier componente.
 * @returns {{success: function(string): void, error: function(string): void, info: function(string): void}}
 */
export function useToast() {
  return useContext(ToastContext) || { success() {}, error() {}, info() {} };
}
