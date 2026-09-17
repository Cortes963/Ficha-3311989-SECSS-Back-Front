const action = (label, path, icon = 'bi-arrow-right') => ({ label, path, icon });

export const roleCardsData = {
  ADMINISTRADOR: {
    title: 'Administrador',
    headerClass: 'bg-admin',
    borderClass: 'border-admin',
    icon: 'bi-gear-fill',
    actions: [
      action('Usuarios y rol · Consultar', '/usuarios', 'bi-people'),
      action('Centros · Registrar / editar / consultar', '/centros', 'bi-building'),
      action('Aprendices · Consultar', '/aprendices', 'bi-mortarboard'),
      action('Jefes de seguridad · Registrar / consultar / deshabilitar', '/jefes-seguridad', 'bi-shield'),
      action('Invitados · Consultar', '/invitados', 'bi-person-lines-fill'),
      action('Cupos · Consultar / deshabilitar', '/cupos', 'bi-car-front'),
      action('PQRS · Registrar / consultar / responder', '/pqrs', 'bi-chat-left-text')
    ]
  },
  JEFE_SEGURIDAD: {
    title: 'Jefe de seguridad',
    headerClass: 'bg-seguridad',
    borderClass: 'border-seguridad',
    icon: 'bi-shield-shaded',
    actions: [
      action('Usuarios y rol · Consultar', '/usuarios', 'bi-people'),
      action('Aprendices · Consultar', '/aprendices', 'bi-mortarboard'),
      action('Celadores · Registrar / consultar / deshabilitar', '/celadores', 'bi-person-badge'),
      action('Invitados · Consultar', '/invitados', 'bi-person-lines-fill'),
      action('Entradas y salidas · Registrar / consultar', '/entradas-salidas', 'bi-journal-text'),
      action('Cupos · Consultar / deshabilitar', '/cupos', 'bi-car-front'),
      action('Reportes · Consultar', '/reportes', 'bi-file-earmark-text')
      , action('PQRS · Registrar / consultar', '/pqrs', 'bi-chat-left-text')
    ]
  },
  CELADOR: {
    title: 'Celador',
    headerClass: 'bg-seguridad',
    borderClass: 'border-seguridad',
    icon: 'bi-person-badge',
    actions: [
      action('Invitados · Consultar', '/invitados', 'bi-person-lines-fill'),
      action('Entradas y salidas · Registrar / consultar', '/entradas-salidas', 'bi-journal-text'),
      action('Cupos · Consultar', '/cupos', 'bi-car-front'),
      action('Reportes · Registrar / editar / consultar', '/reportes', 'bi-file-earmark-text')
      , action('PQRS · Registrar / consultar', '/pqrs', 'bi-chat-left-text')
    ]
  },
  APRENDIZ: {
    title: 'Aprendiz',
    headerClass: 'bg-aprendiz',
    borderClass: 'border-aprendiz',
    icon: 'bi-mortarboard',
    actions: [
      action('Información personal y cuenta', '/perfil', 'bi-person'),
      action('Entradas y salidas · Consultar', '/entradas-salidas', 'bi-journal-text'),
      action('Vehículos · Registrar / editar', '/vehiculos', 'bi-bicycle')
      , action('PQRS · Registrar / consultar', '/pqrs', 'bi-chat-left-text')
    ]
  },
  INVITADO: {
    title: 'Invitado',
    headerClass: 'bg-aprendiz',
    borderClass: 'border-aprendiz',
    icon: 'bi-person-lines-fill',
    actions: [
      action('Información personal y cuenta', '/perfil', 'bi-person'),
      action('Entradas y salidas · Consultar', '/entradas-salidas', 'bi-journal-text'),
      action('Vehículos · Consultar', '/vehiculos', 'bi-bicycle'),
      action('PQRS · Registrar / consultar', '/pqrs', 'bi-chat-left-text')
    ]
  }
};
