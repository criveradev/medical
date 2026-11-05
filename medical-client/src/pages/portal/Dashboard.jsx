import { Link } from 'react-router-dom';
import {
  Users, Wallet, CalendarDays, CheckCircle2, CalendarPlus, UserPlus,
  FileText, FlaskConical, Stethoscope, ArrowRight, TrendingUp, LayoutDashboard,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { useMiDoctor } from '../../hooks/useMiDoctor';
import { Spinner, ErrorMsg, Card, PageHeader, Empty } from '../../components/ui';
import { APP_TIME_ZONE, labelEstado, clp } from '../../lib/format';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const colorEstado = {
  pendiente: '#d97706', confirmada: '#1f5fa3', completada: '#0f6e56', cancelada: '#dc2626', no_asistio: '#64748b',
};

/**
 * Tarjeta de métrica (KPI) con icono, etiqueta y valor.
 * @param {{icon: import('react').ComponentType, label: string, value: import('react').ReactNode, tint?: string}} props
 * @returns {JSX.Element}
 */
function Stat({ icon: Icon, label, value, tint, detalle }) {
  return (
    <Card className="min-w-0 p-4 shadow-sm shadow-brand-900/5 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tint}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-slate-600">{label}</p>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight break-words text-brand-900 sm:text-3xl">{value}</p>
      {detalle && <p className="mt-1 text-xs leading-relaxed text-slate-600">{detalle}</p>}
    </Card>
  );
}

const tooltipStyle = { borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' };

/**
 * Inicio del administrador: KPIs globales y gráficos (recaudación, citas por
 * estado y por mes) a partir del reporte de admin.
 * @returns {JSX.Element}
 */
function AdminHome() {
  const { data, loading, error } = useFetch('/reportes/admin');
  if (loading) return <Spinner />;
  if (error) return <ErrorMsg>{error}</ErrorMsg>;

  const r = data?.resumen || {};
  const porEstado = r.citasPorEstado || [];
  const totalCitas = porEstado.reduce((s, e) => s + e.total, 0);
  const completadas = porEstado.find((e) => e._id === 'completada')?.total || 0;

  const dataMes = (r.citasPorMes || []).map((m) => ({
    name: `${MESES[(m._id?.mes || 1) - 1]} ${String(m._id?.anio || '').slice(2)}`,
    citas: m.total,
  }));
  const pendientes = porEstado.find(e => e._id === 'pendiente')?.total || 0;
  const porcentajeCompletadas = totalCitas > 0 ? Math.round(completadas / totalCitas * 100) : 0;
  const dataEstado = [...porEstado].sort((a, b) => b.total - a.total);
  const accesos = [
    { to: '/portal/citas', icon: CalendarPlus, titulo: 'Gestionar citas', detalle: 'Consulta y actualiza la agenda' },
    { to: '/portal/pacientes', icon: UserPlus, titulo: 'Ver pacientes', detalle: 'Accede a las fichas de pacientes' },
    { to: '/portal/pagos', icon: Wallet, titulo: 'Revisar pagos', detalle: 'Consulta cobros y comprobantes' },
  ];

  return (
    <div className="space-y-5">
      <section aria-label="Indicadores de la clínica" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon={Users} label="Pacientes activos" value={r.totalPacientes ?? 0} detalle="Fichas activas en la clínica" tint="bg-brand-50 text-brand-700" />
        <Stat icon={CalendarDays} label="Citas registradas" value={totalCitas} detalle={`${pendientes} pendientes de confirmación`} tint="bg-amber-50 text-amber-700" />
        <Stat icon={CheckCircle2} label="Completadas" value={completadas} detalle={`${porcentajeCompletadas}% de las citas registradas`} tint="bg-emerald-50 text-emerald-700" />
        <Stat icon={Wallet} label="Recaudado" value={clp(r.totalRecaudado)} detalle="Importe de los pagos realizados" tint="bg-brand-50 text-brand-700" />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="min-w-0 p-5 shadow-sm shadow-brand-900/5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-brand-900">Actividad de la agenda</h2>
              <p className="mt-1 text-xs text-slate-600">Citas registradas por mes de creación</p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">Histórico</span>
          </div>
          {dataMes.length === 0 ? (
            <Empty>Aún no hay citas registradas.</Empty>
          ) : (
            <>
              <div className="h-56 w-full min-w-0" aria-hidden="true">
                <ResponsiveContainer>
                  <BarChart data={dataMes} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barSize={40}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#d8e9f7" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#475569' }} minTickGap={20} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={36} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#eff6fc' }} />
                    <Bar dataKey="citas" name="Citas" fill="#1f5fa3" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <details className="mt-3 border-t border-brand-100 pt-3 text-xs text-slate-600">
                <summary className="cursor-pointer rounded-md py-1 font-semibold text-brand-700">Ver cifras por mes</summary>
                <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                  {dataMes.map(mes => (
                    <div key={mes.name} className="flex justify-between gap-4 rounded-lg bg-brand-50 px-3 py-2">
                      <dt>{mes.name}</dt><dd className="font-semibold text-brand-900">{mes.citas} citas</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </>
          )}
        </Card>

        <Card className="min-w-0 p-5 shadow-sm shadow-brand-900/5 sm:p-6">
          <h2 className="text-base font-bold text-brand-900">Estado de las citas</h2>
          <p className="mt-1 text-xs text-slate-600">Distribución de las {totalCitas} citas registradas</p>
          {totalCitas === 0 ? (
            <Empty>Aún no hay citas para mostrar.</Empty>
          ) : (
            <dl className="mt-6 space-y-5">
              {dataEstado.map(estado => {
                const porcentaje = Math.round(estado.total / totalCitas * 100);
                return (
                  <div key={estado._id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <dt className="font-medium text-slate-700">{labelEstado[estado._id] || estado._id}</dt>
                      <dd className="shrink-0 font-bold text-brand-900">
                        {estado.total} <span className="ml-2 text-xs font-normal text-slate-600">{porcentaje}%</span>
                      </dd>
                    </div>
                    <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-brand-50">
                      <div className="h-full rounded-full" style={{ width: `${estado.total / totalCitas * 100}%`, backgroundColor: colorEstado[estado._id] || '#64748b' }} />
                    </div>
                  </div>
                );
              })}
            </dl>
          )}
          <Link to="/portal/citas" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-brand-600">
            Ver todas las citas <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Card>
      </div>

      <section aria-labelledby="accesos-dashboard">
        <h2 id="accesos-dashboard" className="mb-3 text-base font-bold text-brand-900">Gestión de la clínica</h2>
        <div className="grid gap-3 lg:grid-cols-3">
          {accesos.map(({ to, icon: Icono, titulo, detalle }) => (
            <Link key={to} to={to} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm shadow-brand-900/5 transition hover:border-brand-300 focus-visible:outline-2 focus-visible:outline-brand-600">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icono size={20} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-brand-900">{titulo}</h3>
                <p className="mt-1 text-xs text-slate-600">{detalle}</p>
              </div>
              <ArrowRight size={17} className="shrink-0 text-brand-500" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Inicio de recepción/enfermería: accesos rápidos y resumen operativo del día.
 * @returns {JSX.Element}
 */
function StaffHome() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link to="/portal/citas">
        <Card className="p-6 transition hover:border-brand-300">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <CalendarPlus size={22} />
          </span>
          <h3 className="mt-4 font-semibold text-slate-900">Agendar una cita</h3>
          <p className="mt-1 text-sm text-slate-500">Revisa la agenda y reserva un horario disponible.</p>
        </Card>
      </Link>
      <Link to="/portal/pacientes">
        <Card className="p-6 transition hover:border-brand-300">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <UserPlus size={22} />
          </span>
          <h3 className="mt-4 font-semibold text-slate-900">Registrar paciente</h3>
          <p className="mt-1 text-sm text-slate-500">Da de alta a un nuevo paciente en el sistema.</p>
        </Card>
      </Link>
    </div>
  );
}

/**
 * Inicio del paciente: bienvenida y accesos rápidos a sus citas, historial,
 * resultados y pagos.
 * @returns {JSX.Element}
 */
function PacienteHome() {
  const links = [
    { to: '/portal/mis-citas', icon: CalendarDays, t: 'Mis citas', d: 'Revisa tus próximas y pasadas atenciones.' },
    { to: '/portal/mi-historial', icon: FileText, t: 'Mi historial', d: 'Tus diagnósticos y tratamientos.' },
    { to: '/portal/mis-resultados', icon: FlaskConical, t: 'Mis resultados', d: 'Consulta y descarga tus exámenes.' },
    { to: '/portal/mis-pagos', icon: Wallet, t: 'Mis pagos', d: 'Historial de pagos de tus consultas.' },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {links.map((l) => (
        <Link key={l.to} to={l.to}>
          <Card className="p-6 transition hover:border-brand-300">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <l.icon size={22} />
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">{l.t}</h3>
            <p className="mt-1 text-sm text-slate-500">{l.d}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}

/**
 * Mini-panel de estadísticas del doctor: KPIs y gráficos a partir de su reporte.
 * @param {{doctorId: string}} props - ID del doctor.
 * @returns {JSX.Element}
 */
function DoctorStats({ doctorId }) {
  const { data, loading, error } = useFetch(`/reportes/doctor/${doctorId}`);
  if (loading) return <Spinner />;
  if (error) return <ErrorMsg>{error}</ErrorMsg>;
  const r = data?.resumen || {};
  const dataMes = (r.citasPorMes || []).map((m) => ({
    name: `${MESES[(m._id?.mes || 1) - 1]} ${String(m._id?.anio || '').slice(2)}`,
    citas: m.total,
  }));
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat icon={Stethoscope} label="Atenciones completadas" value={r.totalAtenciones ?? 0} tint="bg-brand-50 text-brand-600" />
        <Stat icon={Users} label="Pacientes únicos" value={r.totalPacientesUnicos ?? 0} tint="bg-emerald-50 text-emerald-600" />
      </div>

      <Card className="mt-4 p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-600" />
          <h2 className="text-sm font-semibold text-slate-900">Mis citas por mes</h2>
        </div>
        {dataMes.length === 0 ? (
          <Empty>Aún no tienes citas registradas.</Empty>
        ) : (
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <AreaChart data={dataMes} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCitasDoc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2e75bb" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2e75bb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="citas" stroke="#2e75bb" strokeWidth={2.5} fill="url(#gradCitasDoc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Link to="/portal/mi-agenda">
        <Card className="mt-6 flex items-center justify-between p-6 transition hover:border-brand-300">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <CalendarDays size={22} />
            </span>
            <div>
              <h3 className="font-semibold text-slate-900">Ver mi agenda</h3>
              <p className="text-sm text-slate-500">Tus citas del día y registrar atenciones.</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-slate-400" />
        </Card>
      </Link>
    </>
  );
}

/**
 * Inicio del doctor: sus estadísticas (DoctorStats) y acceso a su agenda.
 * @returns {JSX.Element}
 */
function DoctorHome() {
  const { doctorId, loading, error } = useMiDoctor();
  if (loading) return <Spinner />;
  if (error) return <ErrorMsg>{error}</ErrorMsg>;
  if (!doctorId) return <Card><Empty>No tienes un perfil de doctor asociado.</Empty></Card>;
  return <DoctorStats doctorId={doctorId} />;
}

/**
 * Página de inicio del portal: renderiza el dashboard correspondiente al rol
 * del usuario (admin, recepción/enfermería, doctor o paciente).
 * @returns {JSX.Element}
 */
export default function Dashboard() {
  const { user } = useAuth();
  const rol = user?.rol;
  const esAdmin = rol === 'administrador';
  const esPaciente = rol === 'paciente';
  const esDoctor = rol === 'doctor';

  const subtitle = esAdmin
    ? 'Resumen general de la clínica.'
    : esPaciente
    ? 'Accede a tu información médica.'
    : esDoctor
    ? 'Resumen de tu actividad clínica.'
    : 'Accesos rápidos para tu día a día.';

  return (
    <>
      {esAdmin ? (
        <header className="relative isolate mb-5 flex flex-wrap items-end justify-between gap-5 overflow-hidden rounded-3xl bg-linear-to-br from-brand-900 to-brand-700 p-5 text-white sm:p-7">
          <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-20 -z-10 size-80 rounded-full border-[36px] border-white/10" />
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-brand-200 uppercase">
              <LayoutDashboard size={16} aria-hidden="true" /> Administración
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Hola, {user?.nombre || 'Admin'}</h1>
            <p className="mt-2 text-sm text-brand-100">La actividad de tu clínica, en un solo lugar.</p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
            <p className="text-xs font-medium text-brand-200">Vista general</p>
            <p className="mt-1 text-sm font-semibold">{new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: APP_TIME_ZONE }).format(new Date())}</p>
          </div>
        </header>
      ) : <PageHeader title={`Hola, ${user?.nombre || ''} 👋`} subtitle={subtitle} />}
      {esAdmin ? <AdminHome /> : esPaciente ? <PacienteHome /> : esDoctor ? <DoctorHome /> : <StaffHome />}
    </>
  );
}
