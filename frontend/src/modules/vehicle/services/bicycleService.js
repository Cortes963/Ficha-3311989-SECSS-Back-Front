// Campos que crearRegistroVehiculo valida como obligatorios cuando
// tipo_vehiculo === 'bicicleta' (ver Backend/controller/vehicle/vehicle.js).
export const CAMPOS_OBLIGATORIOS_BICICLETA = ['numero_marco', 'clase_bicicleta'];

/**
 * Arma el bloque plano de campos de bicicleta para enviarlo junto con los
 * campos comunes del vehículo en el mismo POST /vehicle (el backend no
 * espera un objeto anidado "detalles").
 */
export const construirDetalleBicicleta = ({ numero_marco, clase_bicicleta }) => ({
  numero_marco: numero_marco?.trim(),
  clase_bicicleta,
});

/**
 * Valida que estén los campos obligatorios de bicicleta antes de enviar.
 * El backend igual valida, pero esto evita un viaje de red innecesario.
 */
export const validarDetalleBicicleta = (detalle) =>
  CAMPOS_OBLIGATORIOS_BICICLETA.every((campo) => Boolean(detalle[campo]));