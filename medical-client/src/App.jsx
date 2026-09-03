import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import ProtectedRoute from './components/portal/ProtectedRoute.jsx';
import PortalLayout from './components/portal/PortalLayout.jsx';

const Dashboard = lazy(() => import('./pages/portal/Dashboard.jsx'));
const Citas = lazy(() => import('./pages/portal/Citas.jsx'));
const Pacientes = lazy(() => import('./pages/portal/Pacientes.jsx'));
const Doctores = lazy(() => import('./pages/portal/Doctores.jsx'));
const Especialidades = lazy(() => import('./pages/portal/Especialidades.jsx'));
const Departamentos = lazy(() => import('./pages/portal/Departamentos.jsx'));
const Usuarios = lazy(() => import('./pages/portal/Usuarios.jsx'));
const Auditoria = lazy(() => import('./pages/portal/Auditoria.jsx'));
const Pagos = lazy(() => import('./pages/portal/Pagos.jsx'));
const Perfil = lazy(() => import('./pages/portal/Perfil.jsx'));
const MisCitas = lazy(() => import('./pages/portal/paciente/MisCitas.jsx'));
const MiHistorial = lazy(() => import('./pages/portal/paciente/MiHistorial.jsx'));
const MisResultados = lazy(() => import('./pages/portal/paciente/MisResultados.jsx'));
const MisPagos = lazy(() => import('./pages/portal/paciente/MisPagos.jsx'));
const MiAgenda = lazy(() => import('./pages/portal/doctor/MiAgenda.jsx'));
const SubirResultado = lazy(() => import('./pages/portal/doctor/SubirResultado.jsx'));

/**
 * Componente raíz: define el árbol de rutas (landing pública, login y portal
 * protegido por rol) envuelto en los providers de la app.
 * @returns {JSX.Element}
 */
export default function App() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Cargando…</div>}>
      <Routes>
      {/* Público */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      {/* Portal protegido */}
      <Route
        path="/portal"
        element={
          <ProtectedRoute>
            <PortalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="citas" element={<Citas />} />
        <Route path="pacientes" element={<Pacientes />} />
        <Route path="pagos" element={<Pagos />} />
        <Route path="doctores" element={<Doctores />} />
        <Route path="especialidades" element={<Especialidades />} />
        <Route path="departamentos" element={<Departamentos />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="auditoria" element={<Auditoria />} />

        {/* Doctor */}
        <Route path="mi-agenda" element={<MiAgenda />} />
        <Route path="subir-resultado" element={<SubirResultado />} />

        {/* Paciente */}
        <Route path="mis-citas" element={<MisCitas />} />
        <Route path="mi-historial" element={<MiHistorial />} />
        <Route path="mis-resultados" element={<MisResultados />} />
        <Route path="mis-pagos" element={<MisPagos />} />
      </Route>
      </Routes>
    </Suspense>
  );
}
