import { Activity, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { clinica } from '../data/clinic';

/**
 * Pie de página de la landing pública con datos de contacto de la clínica.
 * @returns {JSX.Element}
 */
export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Activity size={20} strokeWidth={2.4} />
            </span>
            <span className="text-lg font-semibold text-slate-900">{clinica.nombre}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-slate-600">
            Atención médica cercana y tecnología al servicio de tu bienestar.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Contacto</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2"><MapPin size={16} className="text-brand-600" /> {clinica.direccion}</li>
            <li className="flex items-center gap-2"><Phone size={16} className="text-brand-600" /> {clinica.telefono}</li>
            <li className="flex items-center gap-2"><Mail size={16} className="text-brand-600" /> {clinica.email}</li>
            <li className="flex items-center gap-2"><Clock size={16} className="text-brand-600" /> {clinica.horario}</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Accesos</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><a href="#especialidades" className="transition hover:text-brand-600">Especialidades</a></li>
            <li><a href="#doctores" className="transition hover:text-brand-600">Equipo médico</a></li>
            <li><a href="/login" className="transition hover:text-brand-600">Portal de pacientes</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200 py-4">
        <p className="text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {clinica.nombre}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
