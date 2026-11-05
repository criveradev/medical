import { useState } from 'react';
import { Loader2, X, Inbox, AlertCircle, Eye, EyeOff } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

/** Clase Tailwind reutilizable para inputs/selects/textarea. @type {string} */
export const inputCls =
  'min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition sm:text-sm ' +
  'focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500';

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
    <header className="relative isolate mb-5 flex flex-wrap items-end justify-between gap-5 overflow-hidden rounded-3xl bg-linear-to-br from-brand-900 to-brand-700 p-5 text-white sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -top-28 -right-20 -z-10 size-72 rounded-full border-[32px] border-white/10" />
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-widest text-brand-200 uppercase">Medical · Portal</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight break-words">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-100">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2 [&_button]:border-white/30 [&_button]:bg-white [&_button]:text-brand-900 [&_button:hover]:bg-brand-100">{children}</div>}
    </header>
  );
}

/**
 * Contenedor con borde y fondo blanco redondeado.
 * @param {{children: import('react').ReactNode, className?: string}} props
 * @returns {JSX.Element}
 */
export function Card({ children, className = '', ...props }) {
  return (
    <div className={'min-w-0 rounded-2xl border border-brand-100 bg-white shadow-sm shadow-brand-900/5 ' + className} {...props}>{children}</div>
  );
}

/**
 * Botón con variantes de estilo (primary, ghost, danger).
 * @param {{children: import('react').ReactNode, variant?: 'primary'|'ghost'|'danger', className?: string}} props - Resto de props se pasan al <button>.
 * @returns {JSX.Element}
 */
export function Btn({ children, variant = 'primary', className = '', ...props }) {
  const base =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60';
  const variants = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800',
    ghost: 'border border-brand-200 bg-white text-brand-800 hover:bg-brand-50',
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
    <div className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center text-sm leading-relaxed text-slate-600">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Inbox size={26} aria-hidden="true" /></span> {children}
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
      {hint && <span className="mt-1 block text-xs text-slate-600">{hint}</span>}
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-900/60 p-3 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full min-w-0 max-w-lg overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-brand-100 bg-brand-50 px-5 py-4">
          <h2 className="text-lg font-bold text-brand-900">{title}</h2>
          <button onClick={onClose} type="button" className="grid size-11 shrink-0 place-items-center rounded-xl text-brand-700 transition hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-600" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
