// Configuración de navegación del portal según el rol del usuario.
// Los nombres de icono corresponden a exports de lucide-react.

export const menu = [
  { to: '/portal', label: 'Inicio', icon: 'LayoutDashboard', exact: true, roles: ['administrador', 'recepcionista', 'enfermero', 'doctor', 'paciente'] },
  { to: '/portal/citas', label: 'Citas', icon: 'CalendarDays', roles: ['administrador', 'recepcionista'] },
  { to: '/portal/pacientes', label: 'Pacientes', icon: 'Users', roles: ['administrador', 'recepcionista'] },
  { to: '/portal/pagos', label: 'Pagos', icon: 'Wallet', roles: ['administrador', 'recepcionista'] },
  { to: '/portal/doctores', label: 'Doctores', icon: 'Stethoscope', roles: ['administrador'] },
  { to: '/portal/especialidades', label: 'Especialidades', icon: 'ListTree', roles: ['administrador'] },
  { to: '/portal/departamentos', label: 'Departamentos', icon: 'Building2', roles: ['administrador'] },
  { to: '/portal/usuarios', label: 'Usuarios', icon: 'UserCog', roles: ['administrador'] },
  { to: '/portal/auditoria', label: 'Auditoría', icon: 'ClipboardList', roles: ['administrador'] },

  // Doctor
  { to: '/portal/mi-agenda', label: 'Mi agenda', icon: 'CalendarDays', roles: ['doctor'] },
  { to: '/portal/subir-resultado', label: 'Resultados', icon: 'FlaskConical', roles: ['doctor'] },

  // Paciente
  { to: '/portal/mis-citas', label: 'Mis citas', icon: 'CalendarDays', roles: ['paciente'] },
  { to: '/portal/mi-historial', label: 'Mi historial', icon: 'FileText', roles: ['paciente'] },
  { to: '/portal/mis-resultados', label: 'Mis resultados', icon: 'FlaskConical', roles: ['paciente'] },
  { to: '/portal/mis-pagos', label: 'Mis pagos', icon: 'Wallet', roles: ['paciente'] },
];

/**
 * Filtra los ítems del menú visibles para un rol dado.
 * @param {string} rol - Rol del usuario (administrador, doctor, paciente…).
 * @returns {Array<object>} Ítems de menú accesibles por ese rol.
 */
export function menuParaRol(rol) {
  return menu.filter((m) => m.roles.includes(rol));
}

// Etiqueta legible y color por rol (para badges).
export const rolInfo = {
  administrador: { label: 'Administrador', color: 'brand' },
  recepcionista: { label: 'Recepción', color: 'amber' },
  doctor: { label: 'Doctor', color: 'teal' },
  enfermero: { label: 'Enfermería', color: 'teal' },
  paciente: { label: 'Paciente', color: 'slate' },
};
