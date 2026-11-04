import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

/**
 * Hook para hacer un GET con estado de carga/error y recarga manual.
 * @param {string} url - URL del endpoint a consultar.
 * @returns {{data: object|null, loading: boolean, error: string, reload: function(): Promise<void>}} Estado y función de recarga.
 */
export function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(url);
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { data, loading, error, reload: cargar };
}
