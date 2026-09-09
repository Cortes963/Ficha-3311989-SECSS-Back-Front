// Operaciones del módulo Reporte contra el backend Java Spring Boot.
// Modelado sobre pqrsService.js: mismo cliente HTTP, mismas convenciones
// (camelCase, paginación base 0, sobre de error { ok:false, mensaje }).
import { apiClient } from '@/services/apiClient';

/** Crea un reporte. `idEntradaSalida` es opcional (relación REPORTE_REGISTRO). */
export const crearReporte = ({ idUsuarioCelador, asunto, cuerpo, estado, idEntradaSalida }) =>
  apiClient.post('/reportes', { idUsuarioCelador, asunto, cuerpo, estado, idEntradaSalida });

/** Lista reportes paginados, con filtros opcionales de celador y estado. */
export const listarReportes = ({ idUsuarioCelador, estado, pagina = 0, limite = 20 } = {}) => {
  const parametros = new URLSearchParams({ pagina, limite });
  if (idUsuarioCelador !== undefined) parametros.set('idUsuarioCelador', idUsuarioCelador);
  if (estado !== undefined) parametros.set('estado', estado);
  return apiClient.get(`/reportes?${parametros}`);
};

/** Detalle de un reporte puntual. */
export const obtenerReporte = (id) => apiClient.get(`/reportes/${id}`);

/** Actualiza un reporte existente. */
export const actualizarReporte = (id, { idUsuarioCelador, asunto, cuerpo, estado, idEntradaSalida }) =>
  apiClient.put(`/reportes/${id}`, { idUsuarioCelador, asunto, cuerpo, estado, idEntradaSalida });

/** Elimina un reporte. */
export const eliminarReporte = (id) => apiClient.delete(`/reportes/${id}`);
