import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const NotificationsContext = createContext(null);

let _id = 0;

/**
 * Provider de notificaciones en tiempo real (Socket.io). Se conecta con la cookie
 * segura de sesión y acumula los eventos recibidos (citas, pagos, resultados…).
 * @param {{children: import('react').ReactNode}} props
 * @returns {JSX.Element}
 */
export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const socketRef = useRef(null);

  /**
   * Agrega una notificación al inicio de la lista (máx. 50).
   * @param {string} tipo - Tipo de evento (cita, pago, resultado, historial).
   * @param {{mensaje?: string}} data - Payload del evento.
   * @returns {void}
   */
  const add = useCallback((tipo, data) => {
    setItems((prev) => [
      { id: ++_id, tipo, mensaje: data?.mensaje || 'Nueva notificación', hora: new Date(), leida: false },
      ...prev,
    ].slice(0, 50));
  }, []);

  /** Marca todas las notificaciones como leídas. @returns {void} */
  const markAllRead = useCallback(() => setItems((p) => p.map((n) => ({ ...n, leida: true }))), []);
  /** Elimina todas las notificaciones. @returns {void} */
  const clear = useCallback(() => setItems([]), []);

  useEffect(() => {
    if (!user) return;
    // El servidor valida la sesión y une el socket a la sala correcta según el rol.
    // En producción se conecta a VITE_API_URL (backend); en desarrollo, same-origin
    // (el proxy de Vite reenvía el WebSocket al backend).
    const socket = io(import.meta.env.VITE_API_URL || undefined, {
      path: '/socket.io',
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('cita:nueva', (d) => add('cita', d));
    socket.on('cita:actualizada', (d) => add('cita', d));
    socket.on('pago:nuevo', (d) => add('pago', d));
    socket.on('resultado:nuevo', (d) => add('resultado', d));
    socket.on('historial:nuevo', (d) => add('historial', d));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, add]);

  const unread = items.filter((n) => !n.leida).length;

  return (
    <NotificationsContext.Provider value={{ items, unread, markAllRead, clear }}>
      {children}
    </NotificationsContext.Provider>
  );
}

/**
 * Hook para acceder a las notificaciones en tiempo real.
 * @returns {{items: Array, unread: number, markAllRead: Function, clear: Function}}
 */
export function useNotifications() {
  return useContext(NotificationsContext) || { items: [], unread: 0, markAllRead: () => {}, clear: () => {} };
}
