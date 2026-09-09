// Campos que crearRegistroVehiculo valida como obligatorios cuando
// tipo_vehiculo === 'moto' (ver Backend/controller/vehicle/vehicle.js).
export const CAMPOS_OBLIGATORIOS_MOTO = [
  'placa',
  'cilindraje',
  'modelo',
  'imagen_url_soat',
  'imagen_url_tecnomecanica_vigente',
];

/**
 * Arma el bloque plano de campos de moto para enviarlo junto con los
 * campos comunes del vehículo en el mismo POST /vehicle (el backend no
 * espera un objeto anidado "detalles").
 */
export const construirDetalleMoto = ({
  placa,
  cilindraje,
  modelo,
  imagen_url_soat,
  imagen_url_tecnomecanica_vigente,
}) => ({
  placa: placa?.toUpperCase().trim(),
  cilindraje: Number(cilindraje),
  modelo,
  imagen_url_soat,
  imagen_url_tecnomecanica_vigente,
});

/**
 * Valida que estén los campos obligatorios de moto antes de enviar.
 * El backend igual valida, pero esto evita un viaje de red innecesario.
 */
export const validarDetalleMoto = (detalle) =>
  CAMPOS_OBLIGATORIOS_MOTO.every((campo) => Boolean(detalle[campo]));