import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clinica } from '../data/clinic';

export const campoPublico =
  'mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50 sm:text-sm';

export const botonPublico = 'min-h-11 w-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600';

export default function FlujoPublico({
  seccion, titulo, descripcion, mensaje, detalle, lateral, volverA = '/', volverTexto = 'Volver al inicio', children,
}) {
  return (
    <div className="min-h-screen bg-brand-50">
      <header className="border-b border-brand-100 bg-white/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link to="/" className="inline-flex items-center gap-2.5 text-lg font-bold text-brand-900">
            <img src="/favicon.svg" alt="" width="36" height="36" />
            {clinica.nombre}
          </Link>
          <Link to={volverA} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600">
            <ArrowLeft size={16} aria-hidden="true" /> {volverTexto}
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl items-start gap-0 px-4 py-6 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-6 lg:py-14">
        <aside className="relative isolate overflow-hidden rounded-t-3xl bg-linear-to-br from-brand-900 to-brand-700 px-5 py-6 text-white sm:px-8 lg:rounded-3xl lg:px-9 lg:py-10">
          <div aria-hidden="true" className="pointer-events-none absolute -top-28 -right-24 -z-10 size-72 rounded-full border-[32px] border-white/10" />
          <p className="text-xs font-semibold tracking-[0.2em] text-brand-200 uppercase">{seccion}</p>
          <p className="mt-2 max-w-[16ch] text-2xl leading-tight font-semibold tracking-tight sm:text-3xl lg:mt-4 lg:text-4xl">{mensaje}</p>
          <p className="mt-3 hidden max-w-sm text-sm leading-relaxed text-brand-100 lg:block">{detalle}</p>
          {lateral && <div className="mt-5 lg:mt-8">{lateral}</div>}
        </aside>

        <section aria-labelledby="flujo-titulo" className="min-w-0 rounded-b-3xl border border-brand-100 bg-white p-5 shadow-lg shadow-brand-900/5 sm:p-8 lg:rounded-3xl lg:p-10">
          <div className="mb-6 border-b border-brand-100 pb-5">
            <h1 id="flujo-titulo" className="text-2xl font-bold tracking-tight text-brand-900 sm:text-3xl">{titulo}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{descripcion}</p>
          </div>
          {children}
        </section>
      </main>
    </div>
  );
}

export function PasosPublicos({ pasos, actual, terminado = false }) {
  return (
    <ol aria-label="Progreso" className="grid grid-cols-2 gap-2.5 text-sm lg:grid-cols-1">
      {pasos.map((paso, index) => {
        const activo = index === actual && !terminado;
        const completado = terminado || index < actual;
        return (
          <li key={paso} aria-current={activo ? 'step' : undefined}
            className={`flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 font-medium sm:px-3 ${activo
              ? 'border-white/50 bg-white/15 text-white'
              : 'border-white/15 text-brand-100'}`}>
            <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${activo || completado
              ? 'bg-white text-brand-900' : 'bg-brand-900/65 text-brand-100'}`}>
              {completado ? '✓' : index + 1}
            </span>
            {completado && <span className="sr-only">Completado </span>}
            <span>{paso}</span>
          </li>
        );
      })}
    </ol>
  );
}
