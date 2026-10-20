// Utilidades compartidas por las pruebas de caja negra de input_output y quota.

export const GENERICA = '3/6174426c-cc93-42c9-a968-28e5b470c31f.jpg';
export const INEXISTENTE = 999999999;

const B64 = {
  png: 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGOUq7BhYGBgYmBgYGBgAAAJ5ADW4qoi7QAAAABJRU5ErkJggg==',
  jpg: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDlaKKK4j5s/9k=',
  webp: 'UklGRjQAAABXRUJQVlA4ICgAAACQAQCdASoCAAIAAUAmJaACdLoAA5gA/vDEC68p8Tbf/ME/X7588qAA',
};
const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Archivo de imagen válido (JPG, PNG o WEBP) listo para apiMultipart. */
export const imagen = (campo, formato = 'png') => ({
  campo, nombre: `ok.${formato}`, tipo: MIME[formato], contenido: bytes(B64[formato]),
});
export const imagenGrande = (campo) => ({
  campo, nombre: 'grande.jpg', tipo: 'image/jpeg', contenido: new Uint8Array(5 * 1024 * 1024 + 1),
});
export const archivoPdf = (campo) => ({
  campo, nombre: 'doc.pdf', tipo: 'application/pdf', contenido: new TextEncoder().encode('%PDF-1.4 prueba'),
});
/** MIME y extensión no coinciden: debe rechazarse. */
export const imagenMimeFalso = (campo) => ({
  campo, nombre: 'falsa.jpg', tipo: 'image/png', contenido: bytes(B64.png),
});

export const unico = () => `${Date.now()}`.slice(-8) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
export const futuro = (minutos = 60 * 24) => new Date(Date.now() + minutos * 60 * 1000).toISOString();
export const pasado = (minutos = 60) => new Date(Date.now() - minutos * 60 * 1000).toISOString();

/** Campos válidos de POST /input_output/invitado. `undefined` en un campo = omitirlo. */
export const invitadoBase = (cambios = {}) => {
  const n = unico();
  return {
    tipo_documento: 'CC', numero_documento: n, primer_nombre: 'Invitado', segundo_nombre: '',
    primer_apellido: 'Prueba', segundo_apellido: '', n_celular: '3001234567',
    correo: `invitado.${n}@prueba.test`, tipo_vehiculo: 'MOTO', marca: 'Yamaha', color: 'Negro',
    expira_en: futuro(), ...cambios,
  };
};

export const esperarError = (res, status, mensaje) => {
  expect(res.status, 'código HTTP').to.eq(status);
  expect(res.body.ok, 'ok').to.eq(false);
  if (mensaje) expect(res.body.mensaje, 'mensaje').to.include(mensaje);
};
export const esperarOk = (res, status = 200) => {
  expect(res.status, 'código HTTP').to.eq(status);
  expect(res.body.ok, 'ok').to.eq(true);
};

//  Preparación de estado (usa la API como precondición) 

/** id del vehículo del cupo más reciente del usuario del rol indicado. */
export const vehiculoDe = (rol) =>
  cy.sesionApi(rol).then(({ id }) => cy.apiCall('celador', 'GET', `/quota/usuario/${id}`))
    .then(({ body }) => body.vehiculo?.id_vehiculo ?? 0);

/** Habilita (1) o deshabilita (0) el cupo del rol. Usa ADMIN. */
export const fijarCupo = (rol, estado, idVehiculo) =>
  cy.sesionApi(rol).then(({ id }) => {
    const patch = (v) => cy.apiCall('admin', 'PATCH', `/quota/${id}/${v}`, { body: { estado } })
      .then((r) => { esperarOk(r); });
    return idVehiculo ? patch(idVehiculo) : vehiculoDe(rol).then(patch);
  });

/** Deja al usuario sin entrada abierta (cierra la que tenga). */
export const asegurarFuera = (rol) =>
  cy.sesionApi(rol).then(({ id }) => cy.apiCall('celador', 'GET', `/quota/usuario/${id}`))
    .then(({ body }) => {
      if (body.idEntradaAbierta) {
        return cy.apiCall('celador', 'PATCH', `/input_output/salida/${body.idEntradaAbierta}`, { body: {} });
      }
    });

/** Deja al usuario con una entrada abierta y devuelve su id. Requiere cupo activo. */
export const asegurarDentro = (rol) =>
  cy.sesionApi(rol).then(({ id }) => cy.apiCall('celador', 'GET', `/quota/usuario/${id}`))
    .then(({ body }) => {
      if (body.idEntradaAbierta) return body.idEntradaAbierta;
      return cy.sesionApi(rol).then(({ id }) =>
        cy.apiCall('celador', 'POST', '/input_output/entrada', {
          body: { id_usuario_entra: id, id_vehiculo: body.vehiculo.id_vehiculo },
        })).then((r) => { esperarOk(r, 201); return r.body.id_entrada_salida; });
    });

/** Crea una entrada y la cierra. Devuelve el id del registro cerrado. */
export const registroCerrado = (rol) =>
  asegurarDentro(rol).then((id) =>
    cy.apiCall('celador', 'PATCH', `/input_output/salida/${id}`, { body: {} }).then(() => id));

/** Crea un invitado nuevo por API y devuelve el body (ids y credenciales temporales). */
export const crearInvitado = (cambios = {}) =>
  cy.apiMultipart('celador', '/input_output/invitado', invitadoBase(cambios)).then((r) => {
    esperarOk(r, 201);
    return r.body;
  });

// Utilidades para los demás módulos (auth, user, vehicle, pqrs, core) 

/** Como `it`, pero para defectos conocidos del sistema; se omiten con env.omitirDefectosConocidos = true. */
export const defecto = (titulo, fn) => (Cypress.expose('omitirDefectosConocidos') ? it.skip : it)(`[DEFECTO] ${titulo}`, fn);

export const imagenBytes = (formato = 'png') => bytes(B64[formato]);

const letra = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
export const placaUnica = () => `${letra()}${letra()}${letra()}${Math.floor(10 + Math.random() * 90)}${letra()}`;

export const motoBase = (cambios = {}) => ({
  tipo_vehiculo: 'MOTO', marca: 'Honda', color: 'Rojo', placa: placaUnica(), cilindraje: 150, modelo: 2022, ...cambios,
});
export const bicicletaBase = (cambios = {}) => ({
  tipo_vehiculo: 'BICICLETA', marca: 'Trek', color: 'Azul', numero_marco: `M${unico()}`, clase_bicicleta: 'Montaña', ...cambios,
});
export const IMAGENES_MOTO = ['imagen_url_tarjeta_propiedad', 'imagen_url_identificacion_vehiculo', 'imagen_url_vehiculo', 'imagen_url_soat', 'imagen_url_tecnomecanica_vigente'];

/** id de un centro de formación (usa el primero público; si no hay, lo crea como ADMIN). */
export const idCentro = () =>
  cy.apiCall(null, 'GET', '/core/centros-publicos').then((r) => {
    if (r.body.datos?.length) return r.body.datos[0].id;
    return cy.apiCall('admin', 'POST', '/core/centros', { body: { nombre_centro: `Centro ${unico()}` } }).then((c) => c.body.datos.id);
  });

/** Campos de POST /auth/storeAuthRegister (los de detalle_aprendiz van con notación de corchetes). */
export const datosAprendiz = (centro, cambios = {}) => {
  const n = unico();
  return {
    tipo_documento: 'CC', numero_documento: n, primer_nombre: 'Aprendiz', segundo_nombre: '',
    primer_apellido: 'Prueba', segundo_apellido: '', n_celular: '3001234567',
    correo: `aprendiz.${n}@prueba.test`, password: 'Prueba12345!', nombre_rol: 'APRENDIZ',
    'detalle_aprendiz[id_centro]': centro, 'detalle_aprendiz[ficha]': `F${n}`,
    'detalle_aprendiz[direccion]': 'Calle 1 # 2-3', 'detalle_aprendiz[fecha_vinculacion]': '2026-01-15', ...cambios,
  };
};
export const IMAGENES_APRENDIZ = ['imagen_url_aprendiz', 'imagen_url_identificacion', 'imagen_url_carnet_sena'];
export const imagenesAprendiz = () => IMAGENES_APRENDIZ.map((c) => imagen(c, 'png'));

/** Registra un aprendiz desechable por la API pública y lo deja disponible como rol `clave`. */
export const crearAprendiz = (clave, cambios = {}) =>
  idCentro().then((centro) => {
    const datos = datosAprendiz(centro, cambios);
    return cy.apiMultipart(null, '/auth/storeAuthRegister', datos, imagenesAprendiz()).then((r) => {
      esperarOk(r, 201);
      cy.registrarCredenciales(clave, { documento: datos.numero_documento, password: datos.password });
      return { ...datos, id_usuario: r.body.id_usuario, documento: datos.numero_documento };
    });
  });

/** Registra un invitado desechable (con vehículo, cupo activo y entrada abierta) disponible como rol `clave`. */
export const crearInvitadoComo = (clave, cambios = {}) => {
  const datos = invitadoBase(cambios);
  return cy.apiMultipart('celador', '/input_output/invitado', datos).then((r) => {
    esperarOk(r, 201);
    cy.registrarCredenciales(clave, { documento: datos.numero_documento, password: r.body.credenciales_temporales.password });
    return { ...r.body, documento: datos.numero_documento, correo: datos.correo };
  });
};

/** Crea un vehículo del rol (APRENDIZ) y devuelve su id. */
export const crearVehiculoApi = (rol, campos = motoBase(), archivos = []) =>
  cy.apiMultipart(rol, '/vehicle', campos, archivos).then((r) => { esperarOk(r, 201); return r.body.id_vehiculo; });

/** Crea un centro y devuelve { id, nombre_centro }. */
export const crearCentroApi = (nombre = `Centro Prueba ${unico()}`) =>
  cy.apiCall('admin', 'POST', '/core/centros', { body: { nombre_centro: nombre } }).then((r) => { esperarOk(r, 201); return r.body.datos; });

/** Radica una PQRS como el rol indicado y devuelve su identificador. */
export const crearPqrsApi = (rol, asunto, cuerpo = 'Creada por Cypress') =>
  cy.apiCall(rol, 'POST', '/pqrs', { body: { asunto, cuerpo } }).then((r) => {
    expect(r.status, 'radicación de PQRS').to.eq(201);
    return r.body.id_pqrs;
  });

/**
 * Deja el cupo del rol en `estado` y como el MÁS RECIENTEMENTE actualizado.
 * GET /quota ordena por updated_at y la interfaz solo carga los primeros 20 cupos (H-09),
 * así que las pruebas de UI que buscan una fila necesitan que quede al inicio.
 */
export const refrescarCupo = (rol, estado) => fijarCupo(rol, estado ? 0 : 1).then(() => fijarCupo(rol, estado));
