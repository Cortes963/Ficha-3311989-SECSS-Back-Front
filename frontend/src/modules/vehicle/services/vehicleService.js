import { apiClient } from '@/services/apiClient';
import { appendFiles } from '@/utils/media';

/**
 * Módulo VEHÍCULO — capa de servicios.
 *
 * Jerarquía de tablas que refleja este módulo:
 *
 *   vehiculo (supertipo)      -> id, tipo_vehiculo, marca, color, propietario_id
 *     ├── moto (subtipo)      -> placa, cilindraje, modelo, soat, tecnomecánica
 *     └── bicicleta (subtipo) -> numero_marco, clase_bicicleta
 *   imagenes (documentos)     -> soportes asociados al vehículo
 *
 * El backend responde con el sobre { ok, mensaje, datos } igual que el resto
 * de módulos, y recibe los subtipos como campos planos dentro del FormData
 * (así están guardados los registros creados desde la app en db.json).
 */

const desempaquetar = (respuesta) => respuesta?.datos ?? respuesta?.data ?? respuesta;

export const TIPOS_VEHICULO = ['MOTO', 'BICICLETA'];

export const ETIQUETA_TIPO = { MOTO: 'Motocicleta', BICICLETA: 'Bicicleta' };

export const CLASES_BICICLETA = ['Montaña', 'Ruta', 'Urbana', 'Electrica'];

/** Campos que viven en la tabla hija de cada tipo de vehículo. */
export const CAMPOS_DETALLE = {
  MOTO: ['placa', 'cilindraje', 'modelo'],
  BICICLETA: ['numero_marco', 'clase_bicicleta']
};

/** Soportes documentales exigidos por cada subtipo. */
export const CAMPOS_IMAGEN = {
  MOTO: [
    'imagen_url_tarjeta_propiedad',
    'imagen_url_identificacion_vehiculo',
    'imagen_url_vehiculo',
    'imagen_url_soat',
    'imagen_url_tecnomecanica_vigente'
  ],
  BICICLETA: ['imagen_url_factura', 'imagen_url_identificacion_vehiculo', 'imagen_url_vehiculo']
};

export const ETIQUETA_IMAGEN = {
  imagen_url_tarjeta_propiedad: 'Tarjeta de propiedad',
  imagen_url_factura: 'Factura de compra',
  imagen_url_identificacion_vehiculo: 'Identificación / chasis',
  imagen_url_vehiculo: 'Foto del vehículo',
  imagen_url_soat: 'SOAT vigente',
  imagen_url_tecnomecanica_vigente: 'Tecnomecánica vigente'
};

/**
 * El backend guarda las imágenes dentro del objeto `imagenes` con nombres
 * cortos; acá se traduce cada campo del formulario a sus posibles ubicaciones.
 */
const ALIAS_IMAGEN = {
  imagen_url_tarjeta_propiedad: ['tarjeta_propiedad'],
  imagen_url_factura: ['factura'],
  imagen_url_identificacion_vehiculo: ['identificacion_chasis', 'identificacion_vehiculo'],
  imagen_url_vehiculo: ['foto_vehiculo', 'vehiculo'],
  imagen_url_soat: ['soat'],
  imagen_url_tecnomecanica_vigente: ['tecnomecanica_vigente', 'tecnomecanica']
};

export const normalizarTipo = (valor) => {
  const tipo = String(valor || 'MOTO').trim().toUpperCase();
  return TIPOS_VEHICULO.includes(tipo) ? tipo : 'MOTO';
};

/** Busca la URL ya almacenada de un soporte, sin importar dónde la anide el backend. */
export const urlImagenGuardada = (vehiculo, campo) => {
  if (!vehiculo) return '';
  const imagenes = vehiculo.imagenes || {};
  const detalles = vehiculo.detalles || vehiculo.detalle || {};
  const candidatos = [
    vehiculo[campo],
    detalles[campo],
    imagenes[campo],
    ...(ALIAS_IMAGEN[campo] || []).flatMap((alias) => [imagenes[alias], detalles[alias], vehiculo[alias]])
  ];
  return candidatos.find((valor) => typeof valor === 'string' && valor.length > 0) || '';
};

/** Convierte un registro del backend en el objeto plano que consume el formulario. */
export const normalizarVehiculo = (vehiculo) => {
  if (!vehiculo) return null;
  const tipo = normalizarTipo(vehiculo.tipo_vehiculo);
  const detalles = vehiculo.detalles || vehiculo.detalle || {};
  return {
    id: vehiculo.id,
    tipo_vehiculo: tipo,
    marca: vehiculo.marca || '',
    color: vehiculo.color || '',
    propietario_id: vehiculo.propietario_id ?? null,
    estado_cupo: vehiculo.estado_cupo || null,
    detalles: {
      placa: detalles.placa || '',
      cilindraje: detalles.cilindraje ?? '',
      modelo: detalles.modelo ?? '',
      numero_marco: detalles.numero_marco || '',
      clase_bicicleta: detalles.clase_bicicleta || ''
    },
    imagenes: Object.fromEntries(
      (CAMPOS_IMAGEN[tipo] || []).map((campo) => [campo, urlImagenGuardada(vehiculo, campo)])
    ),
    original: vehiculo
  };
};

/** Identificador visible del vehículo según su subtipo (placa o número de marco). */
export const identificadorVehiculo = (vehiculo) => {
  const { tipo_vehiculo: tipo, detalles = {} } = normalizarVehiculo(vehiculo) || {};
  return (tipo === 'MOTO' ? detalles.placa : detalles.numero_marco) || 'Sin identificador';
};

const construirFormData = ({ tipo_vehiculo, marca, color, detalles = {}, imagenes = {} }) => {
  const form = new FormData();
  form.append('tipo_vehiculo', tipo_vehiculo);
  form.append('marca', marca);
  form.append('color', color);
  // Sólo se envían los campos de la tabla hija que corresponden al subtipo.
  (CAMPOS_DETALLE[tipo_vehiculo] || []).forEach((campo) => form.append(campo, detalles[campo] ?? ''));
  appendFiles(form, imagenes); // appendFiles ignora lo que no sea File (URLs previas)
  return form;
};

export const listarMisVehiculos = async () => {
  const respuesta = await apiClient.get('/vehicle/me');
  const datos = desempaquetar(respuesta);
  return Array.isArray(datos) ? datos.map(normalizarVehiculo) : [];
};

export const obtenerVehiculo = async (id) => {
  try {
    const respuesta = await apiClient.get(`/vehicle/${id}`);
    const datos = desempaquetar(respuesta);
    if (datos && !Array.isArray(datos)) return normalizarVehiculo(datos);
  } catch (error) {
    if (error.status && error.status !== 404) throw error;
  }
  // Respaldo: si el backend no expone el detalle, se busca en el listado propio.
  const propios = await listarMisVehiculos();
  return propios.find((vehiculo) => String(vehiculo.id) === String(id)) || null;
};

export const crearVehiculo = (data) => apiClient.post('/vehicle', construirFormData(data));

export const actualizarVehiculo = (id, data) => apiClient.patch(`/vehicle/${id}`, construirFormData(data));

export const eliminarVehiculo = (id) => apiClient.delete(`/vehicle/${id}`);
