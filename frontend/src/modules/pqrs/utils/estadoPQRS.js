const ESTADOS = {
  1: { label: 'Radicado', clase: 'secondary' },
  2: { label: 'En trámite', clase: 'warning' },
  3: { label: 'Resuelto', clase: 'success' },
  4: { label: 'Cerrado', clase: 'dark' },
};

export const estadoPqrsInfo = (estado) => ESTADOS[estado] || { label: 'Sin estado', clase: 'light' };

/** true si la PQRS ya tiene respuesta (RESUELTO o CERRADO). */
export const pqrsYaRespondida = (estado) => estado === 3 || estado === 4;
