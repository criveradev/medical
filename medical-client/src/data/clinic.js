// Contenido de marketing de la landing pública.
// Es contenido curado a propósito (no expone la API de administración).
// Más adelante, en el portal, los datos vienen del backend autenticado.

export const clinica = {
  nombre: 'Medical',
  lema: 'Tu salud, agendada en segundos',
  telefono: '+56 2 2345 6789',
  email: 'contacto@medical.criveradev.com',
  direccion: 'Av. Providencia 1234, Santiago',
  horario: 'Lun a Vie 08:00–20:00 · Sáb 09:00–14:00',
};

export const stats = [
  { valor: '15+', etiqueta: 'Especialidades' },
  { valor: '40', etiqueta: 'Profesionales' },
  { valor: '25k', etiqueta: 'Pacientes atendidos' },
  { valor: '4.8', etiqueta: 'Satisfacción' },
];

export const especialidades = [
  { icon: 'HeartPulse', nombre: 'Cardiología', desc: 'Cuidado integral del corazón y el sistema circulatorio.' },
  { icon: 'Baby', nombre: 'Pediatría', desc: 'Acompañamiento médico para niñas, niños y adolescentes.' },
  { icon: 'Stethoscope', nombre: 'Medicina general', desc: 'Tu primera puerta de entrada a la atención médica.' },
  { icon: 'Eye', nombre: 'Oftalmología', desc: 'Diagnóstico y tratamiento de la salud visual.' },
  { icon: 'Bone', nombre: 'Traumatología', desc: 'Lesiones, huesos, articulaciones y rehabilitación.' },
  { icon: 'Brain', nombre: 'Neurología', desc: 'Atención del sistema nervioso central y periférico.' },
  { icon: 'Activity', nombre: 'Medicina interna', desc: 'Manejo de enfermedades crónicas en adultos.' },
  { icon: 'Smile', nombre: 'Dermatología', desc: 'Salud de la piel, el cabello y las uñas.' },
];

export const doctores = [
  { iniciales: 'CS', nombre: 'Dra. Carla Soto', especialidad: 'Cardiología', exp: '12 años de experiencia' },
  { iniciales: 'JL', nombre: 'Dr. Javier León', especialidad: 'Pediatría', exp: '9 años de experiencia' },
  { iniciales: 'MR', nombre: 'Dr. Mateo Ruiz', especialidad: 'Medicina general', exp: '7 años de experiencia' },
  { iniciales: 'AV', nombre: 'Dra. Ana Vega', especialidad: 'Dermatología', exp: '11 años de experiencia' },
];

export const beneficios = [
  { icon: 'CalendarCheck', titulo: 'Agenda en línea', desc: 'Reserva con el especialista que necesitas en menos de un minuto, viendo la disponibilidad real.' },
  { icon: 'FileText', titulo: 'Historial y resultados', desc: 'Accede a tu historial clínico y descarga tus exámenes cuando los necesites.' },
  { icon: 'BellRing', titulo: 'Recordatorios', desc: 'Te avisamos por correo antes de cada cita para que no se te pase.' },
  { icon: 'ShieldCheck', titulo: 'Datos protegidos', desc: 'Tu información médica viaja cifrada y solo es visible para ti y el personal autorizado.' },
];

export const pasos = [
  { n: '1', titulo: 'Elige especialidad', desc: 'Selecciona el área y el profesional.' },
  { n: '2', titulo: 'Reserva un horario', desc: 'Mira los cupos disponibles y confirma.' },
  { n: '3', titulo: 'Asiste y recibe', desc: 'Atiéndete y revisa tu historial en línea.' },
];
