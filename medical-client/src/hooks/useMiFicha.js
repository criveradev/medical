import { useFetch } from './useFetch';

/**
 * Hook que devuelve la ficha del paciente autenticado (y su pacienteId),
 * necesaria para consultar historial y resultados propios.
 * @returns {{paciente: object|null, pacienteId: string|null, loading: boolean, error: string}}
 */
export function useMiFicha() {
  const { data, loading, error } = useFetch('/pacientes/mi-ficha');
  return {
    paciente: data?.paciente || null,
    pacienteId: data?.paciente?._id || null,
    loading,
    error,
  };
}
