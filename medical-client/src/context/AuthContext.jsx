import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

/**
 * Provider de autenticación: expone el usuario y las acciones login/logout/
 * actualizarFoto. Los JWT se mantienen exclusivamente en cookies HttpOnly;
 * localStorage conserva solo datos no sensibles para pintar la interfaz.
 * @param {{children: import('react').ReactNode}} props
 * @returns {JSX.Element}
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/auth/perfil')
      .then(({ usuario, rol }) => {
        if (!active) return;
        const sessionUser = {
          ...usuario,
          rol: rol?.nombre,
          permisos: rol?.permisos || [],
        };
        localStorage.setItem('user', JSON.stringify(sessionUser));
        setUser(sessionUser);
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  /**
   * Inicia sesión (POST /auth/login) y conserva el usuario de la sesión.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>} El usuario autenticado.
   */
  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    if (data.mfaRequired) return data;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.setItem('user', JSON.stringify(data.usuario));
    setUser(data.usuario);
    return { usuario: data.usuario };
  }, []);

  const verifyMfa = useCallback(async (challengeToken, code) => {
    const data = await api.post('/auth/mfa/verify', { challengeToken, code });
    localStorage.setItem('user', JSON.stringify(data.usuario));
    setUser(data.usuario);
    return data.usuario;
  }, []);

  /**
   * Cierra la sesión en el servidor y limpia siempre los datos locales.
   * @returns {Promise<void>}
   */
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Aunque el servidor no responda, la sesión local debe cerrarse.
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  /**
   * Actualiza la foto de perfil en la sesión (tras subirla).
   * @param {string} foto - URL de la nueva foto.
   * @returns {void}
   */
  const actualizarFoto = useCallback((foto) => {
    setUser((u) => {
      if (!u) return u;
      const nuevo = { ...u, foto };
      localStorage.setItem('user', JSON.stringify(nuevo));
      return nuevo;
    });
  }, []);

  const actualizarMfa = useCallback((mfaEnabled) => {
    setUser((current) => {
      if (!current) return current;
      const updated = { ...current, mfaEnabled };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyMfa, logout, actualizarFoto, actualizarMfa }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de autenticación.
 * @returns {{user: object|null, login: Function, logout: Function, actualizarFoto: Function}}
 */
export function useAuth() {
  return useContext(AuthContext);
}
