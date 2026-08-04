// src/shared/constants/menuOptions.js
export const roleCardsData = {
  ADMINISTRADOR: {
    title: 'Administrador',
    headerClass: 'bg-admin',
    borderClass: 'border-admin',
    icon: 'bi-gear-fill',
    actions: [
      { label: 'Aprendices', path: '/aprendices', icon: 'bi-people' },
      { label: 'Cupos', path: '/cupos', icon: 'bi-car-front' },
      { label: 'PQRS', path: '/configuracion', icon: 'bi-info-circle' }
    ]
  },
  JEFE_SEGURIDAD: {
    title: 'Jefe de Seguridad',
    headerClass: 'bg-seguridad',
    borderClass: 'border-seguridad',
    icon: 'bi-shield-shaded',
    actions: [
      { label: 'Celadores', path: '/celadores', icon: 'bi-people' },
      { label: 'Registros vehiculares', path: '/bitacora/diaria', icon: 'bi-journal-text' },
      { label: 'Cupos', path: '/cupos', icon: 'bi-car-front' },
      { label: 'Reportes', path: '/configuracion', icon: 'bi-exclamation-diamond' },
      { label: 'PQRS', path: '/configuracion', icon: 'bi-info-circle' }
    ]
  },
  CELADOR: {
    title: 'Celador',
    headerClass: 'bg-seguridad',
    borderClass: 'border-seguridad',
    icon: 'bi-person-badge',
    actions: [
      { label: 'Registros vehiculares', path: '/bitacora/diaria', icon: 'bi-journal-text' },
      { label: 'Registrar invitado', path: '/LogbookPage', icon: 'bi-people' },
      { label: 'Cupos', path: '/cupos', icon: 'bi-car-front' },
      { label: 'Reportes', path: '/configuracion', icon: 'bi-exclamation-diamond' },
      { label: 'PQRS', path: '/configuracion', icon: 'bi-info-circle' }
    ]
  },
  APRENDIZ: {
    title: 'Aprendiz',
    headerClass: 'bg-aprendiz',
    borderClass: 'border-aprendiz',
    icon: 'bi-mortarboard',
    actions: [
      { label: 'Cupo', path: '/mi-cupo', icon: 'bi-car-front' },
      { label: 'Registros vehiculares', path: '/bitacora/diaria', icon: 'bi-journal-text' },
      { label: 'PQRS', path: '/configuracion', icon: 'bi-info-circle' }
    ]
  },
  INVITADO: {
    title: 'Invitado',
    headerClass: 'bg-aprendiz',
    borderClass: 'border-aprendiz',
    icon: 'bi-person-lines-fill',
    actions: [
      { label: 'Cupo', path: '/mi-cupo', icon: 'bi-car-front' },
      { label: 'Registros vehiculares', path: '/bitacora/diaria', icon: 'bi-journal-text' },
      { label: 'PQRS', path: '/configuracion', icon: 'bi-info-circle' }
    ]
  }
};

export const navOptions = {
  ADMINISTRADOR: {
    title: 'Administrador',
    headerClass: 'bg-admin',
    borderClass: 'border-admin',
    icon: 'bi-gear-fill',
    actions: [
      { label: 'Aprendices', path: '/ApprenConsullPage', icon: 'bi-people' },
      { label: 'Cupos', path: '/cupos', icon: 'bi-car-front' },
      { label: 'Vehículos', path: '/auditoria', icon: 'bi-bicycle' },
      { label: 'PQRS', path: '/configuracion', icon: 'bi-info-circle' }
    ]
  }
};