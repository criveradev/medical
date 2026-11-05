import { Card } from '../ui';

export function EncabezadoPaciente({ titulo, descripcion, icono: Icono, children }) {
  return (
    <header className="relative isolate mb-6 flex flex-col gap-5 overflow-hidden rounded-3xl bg-linear-to-br from-brand-900 to-brand-700 p-5 text-white sm:flex-row sm:items-end sm:justify-between sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -top-28 -right-24 -z-10 size-72 rounded-full border-[32px] border-white/10" />
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-brand-200 uppercase">
          <Icono size={17} aria-hidden="true" /> Portal de pacientes
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{titulo}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-100">{descripcion}</p>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </header>
  );
}

export function FichaPaciente({ icono: Icono, titulo, detalle, etiqueta, children }) {
  return (
    <Card className="flex min-w-0 flex-col gap-4 p-4 shadow-sm shadow-brand-900/5 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <Icono size={21} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-[1_1_10rem]">
          <h2 className="font-semibold break-words text-brand-900">{titulo}</h2>
          {detalle && <p className="mt-1 text-sm break-words text-slate-600">{detalle}</p>}
        </div>
        {etiqueta}
      </div>
      {children}
    </Card>
  );
}

export function VacioPaciente({ icono: Icono, titulo, children }) {
  return (
    <Card className="grid justify-items-center gap-3 border-dashed px-5 py-10 text-center sm:py-14">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        <Icono size={26} aria-hidden="true" />
      </span>
      <h2 className="font-semibold text-brand-900">{titulo}</h2>
      {children && <p className="max-w-sm text-sm leading-relaxed text-slate-600">{children}</p>}
    </Card>
  );
}
