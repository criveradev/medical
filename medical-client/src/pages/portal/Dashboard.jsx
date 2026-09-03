import { Link } from 'react-router-dom';
import {
  Users, Wallet, CalendarDays, CheckCircle2, CalendarPlus, UserPlus,
  FileText, FlaskConical, Stethoscope, ArrowRight, TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { useMiDoctor } from '../../hooks/useMiDoctor';
import { Spinner, ErrorMsg, Card, PageHeader, Empty } from '../../components/ui';
import { labelEstado, clp } from '../../lib/format';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const colorEstado = {
  pendiente: '#EF9F27', confirmada: '#2e75bb', completada: '#639922', cancelada: '#E24B4A', no_asistio: '#94a3b8',
};

/**
 * Tarjeta de métrica (KPI) con icono, etiqueta y valor.
 * @param {{icon: import('react').ComponentType, label: string, value: import('react').ReactNode, tint?: string}} props
 * @returns {JSX.Element}
 */
function Stat({ icon: Icon, label, value, tint }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tint}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
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
  const dataEstado = porEstado.map((e) => ({
    name: labelEstado[e._id] || e._id, value: e.total, color: colorEstado[e._id] || '#94a3b8',
  }));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Pacientes activos" value={r.totalPacientes ?? 0} tint="bg-brand-50 text-brand-600" />
        <Stat icon={CalendarDays} label="Citas totales" value={totalCitas} tint="bg-amber-50 text-amber-600" />
        <Stat icon={CheckCircle2} label="Completadas" value={completadas} tint="bg-green-50 text-green-600" />
        <Stat icon={Wallet} label="Recaudado" value={clp(r.totalRecaudado)} tint="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Citas por mes */}
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-slate-900">Citas por mes</h2>
          </div>
          {dataMes.length === 0 ? (
            <Empty>Aún no hay datos de citas.</Empty>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={dataMes} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradCitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2e75bb" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2e75bb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} width={28} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="citas" stroke="#2e75bb" strokeWidth={2.5} fill="url(#gradCitas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Citas por estado (donut) */}
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Citas por estado</h2>
          {totalCitas === 0 ? (
            <Empty>Sin citas.</Empty>
          ) : (
            <>
              <div className="relative" style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={dataEstado} dataKey="value" nameKey="name" innerRadius={58} outerRadius={80} paddingAngle={3} stroke="none">
                      {dataEstado.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-semibold text-slate-900">{totalCitas}</span>
                  <span className="text-xs text-slate-400">citas</span>
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                {dataEstado.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-medium text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </>
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
      <PageHeader title={`Hola, ${user?.nombre || ''} 👋`} subtitle={subtitle} />
      {esAdmin ? <AdminHome /> : esPaciente ? <PacienteHome /> : esDoctor ? <DoctorHome /> : <StaffHome />}
    </>
  );
}
