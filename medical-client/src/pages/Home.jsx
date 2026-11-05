import { Link } from 'react-router-dom';
import {
  HeartPulse, Baby, Stethoscope, Eye, Bone, Brain, Activity, Smile,
  CalendarCheck, FileText, BellRing, ShieldCheck,
  CalendarPlus, ArrowRight, Clock, Check,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { stats, especialidades, doctores, beneficios, pasos, clinica } from '../data/clinic';

const iconos = {
  HeartPulse, Baby, Stethoscope, Eye, Bone, Brain, Activity, Smile,
  CalendarCheck, FileText, BellRing, ShieldCheck,
};

/**
 * Página de inicio (landing pública): hero, especialidades, doctores, nosotros
 * y contacto. Punto de entrada para usuarios no autenticados.
 * @returns {JSX.Element}
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main>
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="bg-brand-50">
          <div className="mx-auto max-w-6xl px-4 pt-5 pb-10 sm:px-6 sm:pt-8 sm:pb-14">
            <div className="relative isolate grid items-center gap-7 overflow-hidden rounded-3xl bg-linear-to-br from-brand-900 to-brand-700 px-5 py-8 text-white sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-12 lg:p-14">
              <div aria-hidden="true" className="pointer-events-none absolute -top-40 -right-32 -z-10 size-[30rem] rounded-full border-[48px] border-white/10" />
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-brand-100">
                  <CalendarCheck size={15} aria-hidden="true" /> Agenda en línea
                </span>
                <h1 className="mt-5 max-w-[14ch] text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  {clinica.lema}
                </h1>
                <p className="mt-4 max-w-md text-base leading-relaxed text-brand-100 sm:text-lg">
                  Elige un profesional y encuentra un horario que te acomode. Consulta tus citas, historial y resultados desde el portal.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link to="/agendar" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-brand-900 transition hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                    <CalendarPlus size={18} aria-hidden="true" /> Agendar cita <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <a href="#especialidades" className="inline-flex min-h-12 items-center rounded-xl border border-white/35 px-4 text-sm font-semibold text-white transition hover:bg-white/10">
                    Ver especialidades
                  </a>
                </div>
              </div>

              <aside className="rounded-2xl border border-white/50 bg-white p-5 text-brand-900 shadow-xl shadow-brand-900/20 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <Clock size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold tracking-widest text-brand-700 uppercase">Agenda Medical</p>
                    <h2 className="mt-1 text-lg font-bold tracking-tight">Encuentra tu próximo cupo</h2>
                  </div>
                </div>
                <ol className="mt-5 grid gap-2 text-sm font-medium text-brand-900">
                  {['Elige la especialidad y el profesional', 'Consulta los cupos disponibles', 'Inicia sesión o crea tu cuenta al confirmar'].map((paso, i) => (
                    <li key={paso} className="flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-2.5">
                      <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-900">{i + 1}</span>
                      {paso}
                    </li>
                  ))}
                </ol>
              </aside>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map(s => (
                <div key={s.etiqueta} className="flex flex-col-reverse gap-1 rounded-2xl border border-brand-100 bg-white p-4 sm:p-5">
                  <dt className="text-sm font-medium text-slate-600">{s.etiqueta}</dt>
                  <dd className="text-2xl font-bold tracking-tight text-brand-800 sm:text-3xl">{s.valor}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Especialidades ───────────────────────────────── */}
        <section id="especialidades" className="mx-auto scroll-mt-24 max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">Nuestras especialidades</h2>
            <p className="mt-3 text-slate-600">
              Un equipo multidisciplinario para acompañarte en cada etapa de tu salud.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {especialidades.map((e) => {
              const Ico = iconos[e.icon];
              return (
                <div
                  key={e.nombre}
                  className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm shadow-brand-900/5 transition hover:border-brand-300 sm:p-6"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    {Ico && <Ico size={22} />}
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">{e.nombre}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{e.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Cómo agendar ─────────────────────────────────── */}
        <section className="bg-brand-50">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">Agendar es muy simple</h2>
              <p className="mt-3 text-slate-600">Explora la agenda y accede a tu cuenta cuando tengas un horario elegido.</p>
            </div>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {pasos.map((p) => (
                <li key={p.n} className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm shadow-brand-900/5">
                  <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-brand-100 text-base font-bold text-brand-900">
                    {p.n}
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">{p.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{p.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Doctores ─────────────────────────────────────── */}
        <section id="doctores" className="mx-auto scroll-mt-24 max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">Nuestro equipo médico</h2>
            <p className="mt-3 text-slate-600">Profesionales con vocación y experiencia.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {doctores.map((d) => (
              <div key={d.nombre} className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm shadow-brand-900/5">
                <span className="grid size-14 place-items-center rounded-2xl bg-brand-100 text-lg font-semibold text-brand-800">
                  {d.iniciales}
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{d.nombre}</h3>
                <p className="text-sm text-brand-600">{d.especialidad}</p>
                <p className="mt-1 text-xs text-slate-500">{d.exp}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Nosotros / beneficios ────────────────────────── */}
        <section id="nosotros" className="scroll-mt-24 bg-linear-to-br from-brand-900 to-brand-700">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-white">¿Por qué elegir {clinica.nombre}?</h2>
              <p className="mt-3 text-brand-100">Tecnología y cercanía al servicio de tu bienestar.</p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {beneficios.map((b) => {
                const Ico = iconos[b.icon];
                return (
                  <div key={b.titulo} className="rounded-2xl bg-white/10 p-6 ring-1 ring-white/15">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/15 text-white">
                      {Ico && <Ico size={22} />}
                    </span>
                    <h3 className="mt-4 font-semibold text-white">{b.titulo}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-brand-100">{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CTA final ────────────────────────────────────── */}
        <section id="contacto" className="mx-auto scroll-mt-24 max-w-6xl px-4 py-20 sm:px-6">
          <div className="rounded-3xl border border-brand-100 bg-brand-50 px-5 py-12 text-center sm:px-8 sm:py-14">
            <h2 className="text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">Agenda tu próxima atención</h2>
            <p className="mx-auto mt-3 max-w-md text-slate-600">
              Elige un horario. Inicia sesión o crea tu cuenta al confirmar la reserva.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/agendar"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                <CalendarPlus size={18} /> Agendar ahora
              </Link>
              <a
                href={`tel:${clinica.telefono.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition hover:bg-slate-50"
              >
                Llamar a la clínica
              </a>
            </div>
            <ul className="mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-1.5"><Check size={16} className="text-accent-600" /> Sin filas</li>
              <li className="flex items-center gap-1.5"><Check size={16} className="text-accent-600" /> Recordatorios por correo</li>
              <li className="flex items-center gap-1.5"><Check size={16} className="text-accent-600" /> Resultados en línea</li>
            </ul>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
