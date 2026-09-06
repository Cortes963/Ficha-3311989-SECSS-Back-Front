// NOTA : Cliente HTTP para el backend Java Spring Boot (módulo PQRS + Reporte).
// Es un cliente aparte de apiClient.js porque ese backend vive en un
// servicio/puerto distinto al backend original (Express/Laravel) que
// siguen usando auth, user, vehiculo, quota, dashboard y core.
//
// En éxito, el backend Spring Boot devuelve el recurso (o una página de
// Spring Data) tal cual, sin sobre. En error, devuelve
// { ok: false, mensaje, status, timestamp } (ver GlobalExceptionHandler
// del backend), que es el mismo shape de error que ya maneja apiClient.js,
// por eso la lógica de abajo es intencionalmente igual a la de ese archivo.



const BASE_URL = import.meta.env.VITE_PQRS_API_URL || 'http://localhost:8080/api';

async function request(path, { method = 'GET', body, headers } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Respuesta sin cuerpo JSON (ej. algunos 204/500 sin body)
  }

  const fallo = !response.ok || payload?.ok === false;

  if (fallo) {
    const mensaje = payload?.mensaje || `Error ${response.status}`;
    const error = new Error(mensaje);
    error.status = response.status;
    error.body = payload;
    throw error;
  }

  return payload;
}

export const springApiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
