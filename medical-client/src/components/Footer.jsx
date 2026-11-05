import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { clinica } from '../data/clinic';

/**
 * Pie de página de la landing pública con datos de contacto de la clínica.
 * @returns {JSX.Element}
 */
export default function Footer() {
  return (
    <footer className="border-t border-brand-100 bg-brand-900 text-brand-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" width="36" height="36" alt="" />
            <span className="text-lg font-semibold text-white">{clinica.nombre}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-brand-100">
            Atención médica cercana y tecnología al servicio de tu bienestar.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Contacto</h3>
          <ul className="mt-3 space-y-2 text-sm text-brand-100">
            <li className="flex items-center gap-2"><MapPin size={16} className="text-brand-200" /> {clinica.direccion}</li>
            <li className="flex items-center gap-2"><Phone size={16} className="text-brand-200" /> {clinica.telefono}</li>
            <li className="flex items-center gap-2"><Mail size={16} className="text-brand-200" /> {clinica.email}</li>
            <li className="flex items-center gap-2"><Clock size={16} className="text-brand-200" /> {clinica.horario}</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Accesos</h3>
          <ul className="mt-3 space-y-2 text-sm text-brand-100">
            <li><a href="/agendar" className="font-semibold text-white hover:underline">Agendar cita</a></li>
            <li><a href="#especialidades" className="transition hover:text-white">Especialidades</a></li>
            <li><a href="#doctores" className="transition hover:text-white">Equipo médico</a></li>
            <li><a href="/login" className="transition hover:text-white">Portal de pacientes</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/15 py-4">
        <p className="text-center text-xs text-brand-200">
          © {new Date().getFullYear()} {clinica.nombre}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
