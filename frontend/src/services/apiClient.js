// src/services/apiClient.js
//
// Cliente HTTP centralizado. Reemplaza los ~22 fetch() sueltos que apuntaban
// a http://localhost:3000 (json-server) repartidos en 8 archivos.
//
// El backend real usa dos "sobres" de respuesta distintos según el módulo:
//   { status: 'success' | 'error', message, data }  -> vehiculo, quota, register
//   { ok: true | false, mensaje, ... }               -> auth, user, pqrs, dashboard, core
// En vez de forzar una normalización que oculte esa diferencia, apiClient solo
// unifica el CAMINO DE ERROR (siempre lanza un Error con .message y .status);
// en éxito devuelve el cuerpo tal cual lo manda el backend, para que cada
// módulo lea el campo que realmente le corresponde (data / datos / metrics / usuario).

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

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
    // Respuesta sin cuerpo JSON (poco común en esta API, pero no debe tronar)
  }

  const fallo = !response.ok || payload?.status === 'error' || payload?.ok === false;

  if (fallo) {
    const mensaje = payload?.message || payload?.mensaje || `Error ${response.status}`;
    const error = new Error(mensaje);
    error.status = response.status;
    error.body = payload;
    throw error;
  }

  return payload;
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

// NOTA: el "cliente" :v, sigue apuntando al backend original (Express/Laravel).
// El módulo PQRS/Reporte habla con un backend Java Spring Boot aparte
// (otro puerto), por eso usa su propio cliente: ver springApiClient.js.
// No se cambia BASE_URL aquí para no romper auth/user/vehiculo/quota/etc.