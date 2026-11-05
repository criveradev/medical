import { useState } from 'react';
import { Loader2, X, Inbox, AlertCircle, Eye, EyeOff } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

/** Clase Tailwind reutilizable para inputs/selects/textarea. @type {string} */
export const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition ' +
  'focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50';

/**
 * Indicador de carga centrado con etiqueta opcional.
 * @param {{label?: string}} props
 * @returns {JSX.Element}
 */
export function Spinner({ label = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 size={18} className="animate-spin" /> {label}
    </div>
  );
}

/**
 * Encabezado de página con título, subtítulo y acciones opcionales.
 * @param {{title: string, subtitle?: string, children?: import('react').ReactNode}} props
 * @returns {JSX.Element}
 */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}

/**
 * Contenedor con borde y fondo blanco redondeado.
 * @param {{children: import('react').ReactNode, className?: string}} props
 * @returns {JSX.Element}
 */
export function Card({ children, className = '', ...props }) {
  return (
    <div className={'rounded-xl border border-slate-200 bg-white ' + className} {...props}>{children}</div>
  );
}

/**
 * Botón con variantes de estilo (primary, ghost, danger).
 * @param {{children: import('react').ReactNode, variant?: 'primary'|'ghost'|'danger', className?: string}} props - Resto de props se pasan al <button>.
 * @returns {JSX.Element}
 */
export function Btn({ children, variant = 'primary', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-60';
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    ghost: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
    danger: 'border border-red-300 text-red-700 hover:bg-red-50',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

/**
 * Etiqueta de estado tipo "pill" con color.
 * @param {{color?: 'slate'|'brand'|'teal'|'amber'|'green'|'red', children: import('react').ReactNode}} props
 * @returns {JSX.Element}
 */
export function Badge({ color = 'slate', children }) {
  const colores = {
    slate: 'bg-slate-100 text-slate-700',
    brand: 'bg-brand-100 text-brand-700',
    teal: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colores[color] || colores.slate}`}>
      {children}
    </span>
  );
}

/**
 * Estado vacío con icono y mensaje.
 * @param {{children?: import('react').ReactNode}} props
 * @returns {JSX.Element}
 */
export function Empty({ children = 'Sin registros todavía.' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-400">
      <Inbox size={28} /> {children}
    </div>
  );
}

/**
 * Mensaje de error en recuadro rojo (no renderiza nada si no hay contenido).
 * @param {{children?: import('react').ReactNode}} props
 * @returns {JSX.Element|null}
 */
export function ErrorMsg({ children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
      <AlertCircle size={16} className="mt-0.5 shrink-0" /> {children}
    </div>
  );
}

/**
 * Campo de contraseña con botón para mostrar/ocultar el texto.
 * @param {{value: string, onChange: function, placeholder?: string, required?: boolean, leftIcon?: import('react').ReactNode, autoComplete?: string}} props
 * @returns {JSX.Element}
 */
export function PasswordInput({ value, onChange, placeholder = '••••••••', required, leftIcon = null, autoComplete, ...props }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{leftIcon}</span>
      )}
      <input
        type={ver ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputCls + (leftIcon ? ' pl-9' : '') + ' pr-10'}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
      >
        {ver ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

/**
 * Campo de teléfono internacional (react-phone-number-input), por defecto Chile.
 * @param {{value: string, onChange: function(string): void, defaultCountry?: string}} props
 * @returns {JSX.Element}
 */
export function Telefono({ value, onChange, defaultCountry = 'CL' }) {
  return (
    <PhoneInput
      international
      countryCallingCodeEditable={false}
      defaultCountry={defaultCountry}
      value={value || undefined}
      onChange={(v) => onChange(v || '')}
      placeholder="Ingresa el número"
    />
  );
}

/**
 * Campo de formulario con etiqueta y texto de ayuda opcional.
 * @param {{label: string, children: import('react').ReactNode, hint?: string}} props
 * @returns {JSX.Element}
 */
export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

/**
 * Diálogo modal con overlay; se cierra al hacer clic fuera o en la X.
 * @param {{open: boolean, onClose: function(): void, title: string, children: import('react').ReactNode}} props
 * @returns {JSX.Element|null}
 */
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-700" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
