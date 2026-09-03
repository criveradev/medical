// Cliente HTTP sobre fetch con renovación automática del token.
// En desarrollo, Vite proxea /api → http://localhost:3000 (ver vite.config.js),
// por lo que las llamadas son same-origin y no hay problemas de CORS.
// En producción se define VITE_API_URL con la URL del backend (p. ej. Render);
// si está vacía, las rutas quedan relativas (modo desarrollo con proxy).

/** Origen del backend. Vacío en desarrollo para utilizar el proxy de Vite. */
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE_URL = `${API_ORIGIN}/api/v1`;
let refreshPromise = null;
let csrfToken = sessionStorage.getItem('csrfToken');

function createIdempotencyKey() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  // La clave solo necesita unicidad para reintentos; este fallback cubre
  // navegadores de desarrollo servidos en un origen HTTP no seguro.
  return `medical-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/** Mantiene el token CSRF en memoria y sessionStorage; los JWT viven solo en cookies HttpOnly. */
function setCsrfToken(token) {
  csrfToken = token || null;
  if (csrfToken) sessionStorage.setItem('csrfToken', csrfToken);
  else sessionStorage.removeItem('csrfToken');
}

/**
 * Limpia la sesión (tokens y usuario) del localStorage.
 * @returns {void}
 */
function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  setCsrfToken(null);
}

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;
  const res = await fetch(`${API_BASE_URL}/auth/csrf`, { credentials: 'include' });
  if (!res.ok) throw new Error('No se pudo iniciar la protección de sesión');
  const data = await res.json();
  setCsrfToken(data.csrfToken);
  return csrfToken;
}

/**
 * Intenta renovar el access token usando el refresh token guardado.
 * @returns {Promise<boolean>} true si la renovación fue exitosa.
 */
async function refrescarToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const token = await ensureCsrfToken();
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      });
      if (!res.ok) return false;
      const data = await res.json();
      setCsrfToken(data.csrfToken);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * Realiza una petición JSON autenticada. Si recibe 401, intenta renovar el token
 * una vez y reintenta; si falla, limpia la sesión y redirige a /login.
 * @param {string} method - Método HTTP (GET/POST/PUT/DELETE).
 * @param {string} path - Ruta del recurso dentro de `/api/v1`.
 * @param {object} [body] - Cuerpo a enviar como JSON.
 * @param {boolean} [_reintento=false] - Uso interno: evita bucles de reintento.
 * @returns {Promise<object>} Cuerpo de la respuesta parseado.
 * @throws {Error} Con el mensaje del servidor si la respuesta no es OK.
 */
async function request(method, path, body, _reintento = false, idempotencyKey = null) {
  const headers = { 'Content-Type': 'application/json' };
  const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  if (mutating && path !== '/auth/login') headers['X-CSRF-Token'] = await ensureCsrfToken();
  if (method === 'POST' && idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Token expirado → intentar renovar una vez y reintentar la petición.
  const esEndpointAuth = path === '/auth/login' || path === '/auth/refresh';
  if (res.status === 401 && !_reintento && !esEndpointAuth) {
    const ok = await refrescarToken();
    if (ok) return request(method, path, body, true, idempotencyKey);
    clearSession();
    if (window.location.pathname.startsWith('/portal')) {
      window.location.href = '/login';
    }
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* respuesta sin cuerpo JSON */
  }

  if (!res.ok) {
    const msg =
      data.mensaje ||
      (Array.isArray(data.errores) && data.errores[0]?.msg) ||
      `Error ${res.status}`;
    throw new Error(msg);
  }
  if (data.csrfToken) setCsrfToken(data.csrfToken);
  return data;
}

/**
 * Subida multipart (archivos). No fija Content-Type para que el navegador
 * establezca el boundary correcto del FormData.
 * @param {string} path - Ruta del recurso dentro de `/api/v1`.
 * @param {FormData} formData - Datos del formulario (incluido el archivo).
 * @param {string} [method='POST'] - Método HTTP.
 * @returns {Promise<object>} Cuerpo de la respuesta parseado.
 * @throws {Error} Con el mensaje del servidor si la respuesta no es OK.
 */
async function uploadRequest(path, formData, method = 'POST', _reintento = false) {
  const headers = {};
  headers['X-CSRF-Token'] = await ensureCsrfToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: formData,
  });

  if (res.status === 401 && !_reintento) {
    const ok = await refrescarToken();
    if (ok) return uploadRequest(path, formData, method, true);
    clearSession();
    if (window.location.pathname.startsWith('/portal')) window.location.href = '/login';
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* sin cuerpo */
  }
  if (!res.ok) throw new Error(data.mensaje || `Error ${res.status}`);
  return data;
}

/**
 * Cliente HTTP de la app. Métodos JSON (get/post/put/del) y subida de archivos
 * (upload), todos con autenticación y renovación de token automática.
 */
export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body, false, createIdempotencyKey()),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
  upload: uploadRequest,
};
