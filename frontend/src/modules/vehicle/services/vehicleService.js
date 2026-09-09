import { apiClient } from '@/services/apiClient';
import { construirDetalleMoto, validarDetalleMoto } from './motorcycle';
import { construirDetalleBicicleta, validarDetalleBicicleta } from './bicycle';


// Campos comunes obligatorios sin importar el tipo de vehículo
const CAMPOS_OBLIGATORIOS_COMUNES = [
  'marca',
  'color',
  'imagen_url_tarjeta_propiedad',
  'imagen_url_identificacion_vehiculo',
  'imagen_url_vehiculo',
];

const validarDatosComunes = (datosComunes) =>
  CAMPOS_OBLIGATORIOS_COMUNES.every((campo) => Boolean(datosComunes[campo]));

/**
 * Registra un vehículo (moto o bicicleta) junto con su detalle, en la misma
 * transacción del backend (crearRegistroVehiculo llama internamente a
 * crearDetalleMoto o crearDetalleBicicleta según tipo_vehiculo).
 *
 * Arma el payload PLANO que el backend espera -no anidado en "detalles"- y
 * usa siempre tipo_vehiculo en minúscula ('moto' | 'bicicleta'), que es lo
 * que valida el controller.
 *
 * /**@param {'moto'|'bicicleta'} tipoVehiculo
 * /**@param {object} datosComunes - marca, color, imagen_url_tarjeta_propiedad,
 *   imagen_url_identificacion_vehiculo, imagen_url_vehiculo
 * /**@param {object} datosDetalle - campos propios del tipo (ver
 *   motorcycle.js / bicycle.js para el detalle de cada uno)
 *
 * Responde 409 si la placa o el numero_marco ya existen (índice único en BD).
 */
export const crearVehiculo = (tipoVehiculo, datosComunes, datosDetalle) => {
  if (tipoVehiculo !== 'moto' && tipoVehiculo !== 'bicicleta') {
    return Promise.reject(new Error('tipo_vehiculo debe ser "moto" o "bicicleta"'));
  }

  if (!validarDatosComunes(datosComunes)) {
    return Promise.reject(new Error('Faltan campos obligatorios del vehículo'));
  }

  const detalle =
    tipoVehiculo === 'moto'
      ? construirDetalleMoto(datosDetalle)
      : construirDetalleBicicleta(datosDetalle);

  const detalleValido =
    tipoVehiculo === 'moto' ? validarDetalleMoto(detalle) : validarDetalleBicicleta(detalle);

  if (!detalleValido) {
    const tipoTexto = tipoVehiculo === 'moto' ? 'la moto' : 'la bicicleta';
    return Promise.reject(new Error(`Faltan campos obligatorios de ${tipoTexto}`));
  }

  return apiClient.post('/vehicle', {
    tipo_vehiculo: tipoVehiculo,
    ...datosComunes,
    ...detalle,
  });
};



