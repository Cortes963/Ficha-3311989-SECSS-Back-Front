// Estados posibles de una PQRS.
// Alineados con el DDL: estado tinyint(3) NOT NULL DEFAULT 1
// -- 1: RADICADO, 2: EN_TRAMITE, 3: RESUELTO, 4: CERRADO
export const ESTADOS_PQRS = {
  RADICADO: 1,
  EN_TRAMITE: 2,
  RESUELTO: 3,
  CERRADO: 4
};
