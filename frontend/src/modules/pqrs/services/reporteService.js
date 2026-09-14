// Operaciones del módulo Reporte contra el backend Java Spring Boot.
// Modelado sobre pqrsService.js: mismo cliente HTTP, mismas convenciones
// (camelCase, paginación base 0, sobre de error { ok:false, mensaje }).
// Operaciones del módulo Reporte contra el backend Express real (Backend/routes/attention.routes.js).
import { apiClient } from '@/services/apiClient';

/** Crea un reporte. `idEntradaSalida` es opcional (relación REPORTE_REGISTRO). */
export const crearReporte = ({ idUsuarioCelador, asunto, cuerpo, estado, idEntradaSalida }) =>
  apiClient.post('/reportes', {
    id_usuario_celador: idUsuarioCelador,
    asunto,
    cuerpo,
    estado,
    id_entrada_salida: idEntradaSalida,
  });

/** Lista reportes paginados (base 1, como el resto del backend). */
export const listarReportes = async ({ pagina = 1, limite = 20 } = {}) => {
  const parametros = new URLSearchParams({ pagina, limite });
  const { datos, total } = await apiClient.get(`/reportes?${parametros}`);
  return { datos, total, pagina, limite };
};

/** Detalle de un reporte puntual. */
export const obtenerReporte = async (id) => {
  const { datos } = await apiClient.get(`/reportes/${id}`);
  return datos;
};

/** Actualiza un reporte existente. */
export const actualizarReporte = (id, { asunto, cuerpo, estado }) =>
  apiClient.put(`/reportes/${id}`, { asunto, cuerpo, estado });

/** Elimina un reporte. */
export const eliminarReporte = (id) => apiClient.delete(`/reportes/${id}`);
