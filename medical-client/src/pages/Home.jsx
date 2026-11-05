import { Link } from 'react-router-dom';
import {
  HeartPulse, Baby, Stethoscope, Eye, Bone, Brain, Activity, Smile,
  CalendarCheck, FileText, BellRing, ShieldCheck,
  CalendarPlus, ArrowRight, Clock, Check, Star,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { stats, especialidades, doctores, beneficios, pasos, clinica } from '../data/clinic';

const iconos = {
  HeartPulse, Baby, Stethoscope, Eye, Bone, Brain, Activity, Smile,
  CalendarCheck, FileText, BellRing, ShieldCheck,
};

const slots = [
  { h: '09:00', libre: true }, { h: '09:30', libre: false }, { h: '10:00', libre: true },
  { h: '10:30', libre: true }, { h: '11:00', libre: false }, { h: '11:30', libre: true },
];

/**
 * Página de inicio (landing pública): hero, especialidades, doctores, nosotros
 * y contacto. Punto de entrada para usuarios no autenticados.
 * @returns {JSX.Element}
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="bg-brand-50">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
              <Star size={13} /> Atención de calidad, cerca de ti
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              {clinica.lema}
            </h1>
            <p className="mt-4 max-w-md text-lg text-slate-600">
              Reserva con el especialista que necesitas, revisa tus resultados y lleva tu
              historial clínico desde un solo lugar.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                <CalendarPlus size={18} /> Agendar cita
              </Link>
              <a
                href="#especialidades"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Ver especialidades <ArrowRight size={18} />
              </a>
            </div>
          </div>

          {/* Tarjeta de disponibilidad */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">CS</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Dra. Carla Soto</p>
                  <p className="text-xs text-slate-500">Cardiología</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs text-accent-600">
                <Clock size={14} /> Hoy
              </span>
            </div>
            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-400">
              Horarios disponibles
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {slots.map((s) => (
                <button
                  key={s.h}
                  disabled={!s.libre}
                  className={
                    'rounded-lg py-2 text-sm font-medium transition ' +
                    (s.libre
                      ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                      : 'cursor-not-allowed border border-slate-200 text-slate-300 line-through')
                  }
                >
                  {s.h}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-400">
              * Demostración. En el portal, los cupos se obtienen en vivo de la agenda del doctor.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.etiqueta} className="text-center">
                <p className="text-3xl font-bold text-brand-600">{s.valor}</p>
                <p className="mt-1 text-sm text-slate-500">{s.etiqueta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Especialidades ───────────────────────────────── */}
      <section id="especialidades" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">Nuestras especialidades</h2>
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
                className="rounded-xl border border-slate-200 bg-white p-6 transition hover:border-brand-300 hover:shadow-sm"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
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
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900">Agendar es muy simple</h2>
            <p className="mt-3 text-slate-600">Tres pasos y listo.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {pasos.map((p) => (
              <div key={p.n} className="rounded-xl border border-slate-200 bg-white p-7 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                  {p.n}
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{p.titulo}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Doctores ─────────────────────────────────────── */}
      <section id="doctores" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">Nuestro equipo médico</h2>
          <p className="mt-3 text-slate-600">Profesionales con vocación y experiencia.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {doctores.map((d) => (
            <div key={d.nombre} className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">
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
      <section id="nosotros" className="bg-brand-700">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white">¿Por qué elegir {clinica.nombre}?</h2>
            <p className="mt-3 text-brand-100">Tecnología y cercanía al servicio de tu bienestar.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {beneficios.map((b) => {
              const Ico = iconos[b.icon];
              return (
                <div key={b.titulo} className="rounded-xl bg-brand-600/40 p-6 ring-1 ring-white/10">
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
      <section id="contacto" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-brand-50 px-6 py-14 text-center">
          <h2 className="text-3xl font-bold text-slate-900">¿List@ para cuidar tu salud?</h2>
          <p className="mx-auto mt-3 max-w-md text-slate-600">
            Crea tu cuenta o inicia sesión para agendar tu próxima cita en segundos.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              <CalendarPlus size={18} /> Agendar ahora
            </Link>
            <a
              href={`tel:${clinica.telefono.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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

      <Footer />
    </div>
  );
}
