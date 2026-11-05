import { useFetch } from './useFetch';

/**
 * Hook que devuelve el perfil del doctor autenticado (y su doctorId), necesario
 * para su agenda y reportes.
 * @returns {{doctor: object|null, doctorId: string|null, loading: boolean, error: string}}
 */
export function useMiDoctor() {
  const { data, loading, error } = useFetch('/doctores/mi-perfil');
  return {
    doctor: data?.doctor || null,
    doctorId: data?.doctor?._id || null,
    loading,
    error,
  };
}
