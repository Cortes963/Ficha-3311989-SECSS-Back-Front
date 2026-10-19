// Pruebas de caja negra del módulo vehicle, organizadas por historia de usuario:
import {
  esperarError,
  esperarOk,
  defecto,
  imagen,
  imagenGrande,
  archivoPdf,
  imagenMimeFalso,
  imagenBytes,
  placaUnica,
  motoBase,
  bicicletaBase,
  IMAGENES_MOTO,
  INEXISTENTE,
  idCentro,
  datosAprendiz,
  imagenesAprendiz,
} from '../support/helpers';

const SIN_PERMISO = 'No tiene permisos para esta operación.';
const ID_INVALIDO = 'id debe ser un entero positivo.';
const NO_ENCONTRADO = 'Vehículo no encontrado.';
const IDS_INVALIDOS = ['abc', '0', '-1', '1.5'];
const ROLES_STAFF = ['admin', 'jefe', 'celador'];

const API = () => Cypress.expose('apiUrl');

// ── Aprendices desechables ────────────────────────────────────────────────────
const duenio = {}; // dueño de los vehículos que crean las pruebas
const otro = {}; // segundo aprendiz: sirve para probar que no ve ni toca vehículos ajenos
const vacio = {}; // aprendiz que nunca registra vehículos (lista vacía)

/** multipart/form-data con el token indicado (apiMultipart de commands.js solo acepta roles fijos). */
const enviarMultipart = (token, method, path, campos = {}, archivos = []) => {
  const form = new FormData();
  Object.entries(campos).forEach(([k, v]) => { if (v !== undefined && v !== null) form.append(k, v); });
  archivos.forEach((a) => form.append(a.campo, new Blob([a.contenido], { type: a.tipo }), a.nombre));
  const promesa = fetch(`${API()}${path}`, {
    method, headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form,
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
  return cy.wrap(promesa, { timeout: 30000, log: false });
};

/** Petición JSON a la API autenticada como el aprendiz desechable `u`. */
const como = (u, method, path, opts = {}) => cy.apiCall(null, method, path, { auth: u.auth, ...opts });

/** Registra un aprendiz por la API pública, inicia sesión y guarda token y usuario en `destino`. */
const crearAprendizDesechable = (destino) =>
  idCentro().then((centro) => {
    const datos = datosAprendiz(centro);
    return enviarMultipart(null, 'POST', '/auth/storeAuthRegister', datos, imagenesAprendiz()).then((r) => {
      esperarOk(r, 201);
      return cy.request({
        method: 'POST',
        url: `${API()}/auth/storeAuthLogin`,
        body: { numero_documento: datos.numero_documento, password: datos.password },
        log: false,
      });
    });
  }).then(({ body }) => {
    Object.assign(destino, { token: body.token, auth: `Bearer ${body.token}`, id: body.usuario.id, usuario: body.usuario });
  });

/** Sesión del frontend como un aprendiz desechable (token + usuario en localStorage). */
const uiLoginComo = (u) =>
  cy.session(['ui-vehicle', u.token], () => {
    cy.visit('/login');
    cy.window().then((win) => {
      win.localStorage.setItem('secss_token', u.token);
      win.localStorage.setItem('secss_usuario', JSON.stringify(u.usuario));
    });
  });

// ── Preparación de datos por API ──────────────────────────────────────────────
/** Crea una moto y devuelve { id, ...campos enviados }. */
const nuevaMoto = (u, cambios = {}, archivos = []) => {
  const datos = motoBase(cambios);
  return enviarMultipart(u.token, 'POST', '/vehicle', datos, archivos).then((r) => {
    esperarOk(r, 201);
    return { id: r.body.id_vehiculo, ...datos };
  });
};
const nuevaBici = (u, cambios = {}) => {
  const datos = bicicletaBase(cambios);
  return enviarMultipart(u.token, 'POST', '/vehicle', datos).then((r) => {
    esperarOk(r, 201);
    return { id: r.body.id_vehiculo, ...datos };
  });
};
/** Un ADMIN habilita el cupo del vehículo (los vehículos nuevos nacen con el cupo pendiente = 0). */
const activarCupo = (u, idVehiculo) =>
  cy.apiCall('admin', 'PATCH', `/quota/${u.id}/${idVehiculo}`, { body: { estado: 1 } }).then((r) => esperarOk(r));
const verVehiculo = (u, id) => como(u, 'GET', `/vehicle/${id}`).then((r) => { esperarOk(r); return r.body.datos; });

before(() => {
  crearAprendizDesechable(duenio);
  crearAprendizDesechable(otro);
  crearAprendizDesechable(vacio);
});

// ═════════════════════════════════════════════════════════════════════════════
describe('HU-VH-01 · Registrar vehículo', () => {
  describe('API · POST /vehicle', () => {
    it('CP-VH-01: MOTO válida → 201 y queda con el cupo pendiente de aprobación', () => {
      const datos = motoBase();
      enviarMultipart(duenio.token, 'POST', '/vehicle', datos).then((r) => {
        esperarOk(r, 201);
        expect(r.body.id_vehiculo).to.be.a('number');
        expect(r.body.mensaje).to.eq('Vehículo registrado; cupo pendiente de aprobación.');
        verVehiculo(duenio, r.body.id_vehiculo).then((v) => {
          expect(v.tipo_vehiculo).to.eq('MOTO');
          expect(v.marca).to.eq(datos.marca);
          expect(v.color).to.eq(datos.color);
          expect(v.detalles).to.include({ placa: datos.placa });
          expect(String(v.detalles.cilindraje)).to.eq('150');
          expect(String(v.detalles.modelo)).to.eq('2022');
          expect(v.estado_cupo).to.eq(0);
        });
      });
    });

    it('CP-VH-02: BICICLETA válida → 201 con sus detalles de bicicleta', () => {
      const datos = bicicletaBase();
      enviarMultipart(duenio.token, 'POST', '/vehicle', datos).then((r) => {
        esperarOk(r, 201);
        verVehiculo(duenio, r.body.id_vehiculo).then((v) => {
          expect(v.tipo_vehiculo).to.eq('BICICLETA');
          expect(v.detalles).to.deep.equal({ numero_marco: datos.numero_marco, clase_bicicleta: datos.clase_bicicleta });
          expect(v.estado_cupo).to.eq(0);
        });
      });
    });

    it('CP-VH-03: el tipo en minúsculas se normaliza a MAYÚSCULAS', () => {
      nuevaMoto(duenio, { tipo_vehiculo: 'moto' }).then(({ id }) =>
        verVehiculo(duenio, id).then((v) => expect(v.tipo_vehiculo).to.eq('MOTO')));
    });

    it('CP-VH-04: MOTO con sus 5 soportes → 201 y las 5 imágenes quedan asociadas', () => {
      nuevaMoto(duenio, {}, IMAGENES_MOTO.map((campo) => imagen(campo, 'png'))).then(({ id }) =>
        verVehiculo(duenio, id).then((v) => {
          IMAGENES_MOTO.forEach((campo) => expect(v.imagenes[campo], campo).to.be.a('string').and.not.be.empty);
        }));
    });

    ['tipo_vehiculo', 'marca', 'color'].forEach((campo) => it(`CP-VH-05: sin ${campo} → 400`, () => {
      enviarMultipart(duenio.token, 'POST', '/vehicle', motoBase({ [campo]: undefined }))
        .then((r) => esperarError(r, 400, `Falta el campo obligatorio: ${campo}.`));
    }));

    it('CP-VH-06: tipo fuera del catálogo (CARRO) → 400', () => {
      enviarMultipart(duenio.token, 'POST', '/vehicle', motoBase({ tipo_vehiculo: 'CARRO' }))
        .then((r) => esperarError(r, 400, 'tipo_vehiculo debe ser MOTO o BICICLETA.'));
    });

    ['placa', 'cilindraje', 'modelo'].forEach((campo) => it(`CP-VH-07: MOTO sin ${campo} → 400`, () => {
      enviarMultipart(duenio.token, 'POST', '/vehicle', motoBase({ [campo]: undefined }))
        .then((r) => esperarError(r, 400, `Falta el campo obligatorio: ${campo}.`));
    }));

    ['numero_marco', 'clase_bicicleta'].forEach((campo) => it(`CP-VH-08: BICICLETA sin ${campo} → 400`, () => {
      enviarMultipart(duenio.token, 'POST', '/vehicle', bicicletaBase({ [campo]: undefined }))
        .then((r) => esperarError(r, 400, `Falta el campo obligatorio: ${campo}.`));
    }));

    it('CP-VH-09: placa ya registrada → 409', () => {
      nuevaMoto(duenio).then(({ placa }) =>
        enviarMultipart(otro.token, 'POST', '/vehicle', motoBase({ placa })).then((r) => esperarError(r, 409, 'El registro ya existe.')));
    });

    it('CP-VH-10: número de marco ya registrado → 409', () => {
      nuevaBici(duenio).then(({ numero_marco }) =>
        enviarMultipart(otro.token, 'POST', '/vehicle', bicicletaBase({ numero_marco })).then((r) => esperarError(r, 409, 'El registro ya existe.')));
    });

    it('CP-VH-11: un registro rechazado no deja vehículos a medias', () => {
      como(duenio, 'GET', '/vehicle/me').then((antes) => {
        enviarMultipart(duenio.token, 'POST', '/vehicle', motoBase({ cilindraje: undefined })).then((r) => esperarError(r, 400));
        como(duenio, 'GET', '/vehicle/me').then((despues) => expect(despues.body.datos).to.have.length(antes.body.datos.length));
      });
    });

    [
      ['archivo PDF', archivoPdf],
      ['MIME y extensión que no coinciden', imagenMimeFalso],
    ].forEach(([nombre, armar]) => it(`CP-VH-12: soporte inválido (${nombre}) → 400`, () => {
      enviarMultipart(duenio.token, 'POST', '/vehicle', motoBase(), [armar('imagen_url_vehiculo')])
        .then((r) => esperarError(r, 400, 'Solo se permiten imágenes JPG, PNG o WEBP.'));
    }));

    it('CP-VH-12b: soporte de más de 5 MB → 400', () => {
      enviarMultipart(duenio.token, 'POST', '/vehicle', motoBase(), [imagenGrande('imagen_url_vehiculo')]).then((r) => esperarError(r, 400));
    });

    it('CP-VH-13: registrar otro vehículo desactiva el cupo activo del anterior', () => {
      nuevaMoto(duenio).then((a) => {
        activarCupo(duenio, a.id);
        verVehiculo(duenio, a.id).then((v) => expect(v.estado_cupo).to.eq(1));
        nuevaBici(duenio).then((b) => {
          verVehiculo(duenio, a.id).then((v) => expect(v.estado_cupo, 'cupo del primero').to.eq(0));
          verVehiculo(duenio, b.id).then((v) => expect(v.estado_cupo, 'cupo del nuevo').to.eq(0));
        });
      });
    });

    it('CP-VH-14: el dueño es siempre el del token aunque el cuerpo traiga otro id_usuario', () => {
      nuevaMoto(duenio, { id_usuario: otro.id }).then(({ id }) => {
        como(duenio, 'GET', '/vehicle/me').then((r) => expect(r.body.datos.map((v) => v.id)).to.include(id));
        como(otro, 'GET', '/vehicle/me').then((r) => expect(r.body.datos.map((v) => v.id)).to.not.include(id));
      });
    });

    [...ROLES_STAFF, 'invitado1'].forEach((rol) => it(`CP-VH-15: ${rol} no puede registrar vehículos → 403`, () => {
      cy.apiCall(rol, 'POST', '/vehicle', { body: motoBase() }).then((r) => esperarError(r, 403, SIN_PERMISO));
    }));

    it('CP-VH-16: sin token → 401', () => {
      cy.apiCall(null, 'POST', '/vehicle', { body: motoBase() }).then((r) => esperarError(r, 401, 'Token requerido.'));
    });
  });

  describe('Interfaz · /vehiculos/nuevo', () => {
    const rellenarMoto = ({ marca = 'Honda', color = 'Rojo', placa = placaUnica(), cilindraje = '150', modelo = '2022' } = {}) => {
      cy.get('#marca').type(marca);
      cy.get('#color').type(color);
      cy.get('#placa').type(placa);
      cy.get('#cilindraje').type(cilindraje);
      cy.get('#modelo').type(modelo);
      return placa;
    };
    const enviar = () => cy.contains('button', 'Registrar vehículo').click();

    beforeEach(() => { uiLoginComo(duenio); cy.visit('/vehiculos/nuevo'); });

    it('CP-UI-VH-01: por defecto muestra el formulario de MOTO con sus soportes', () => {
      cy.contains('h2', 'Registrar vehículo').should('be.visible');
      cy.get('#tipo_vehiculo').should('have.value', 'MOTO');
      ['#marca', '#color', '#placa', '#cilindraje', '#modelo'].forEach((id) => cy.get(id).should('be.visible'));
      ['Tarjeta de propiedad', 'Identificación / chasis', 'Foto del vehículo', 'SOAT vigente', 'Tecnomecánica vigente']
        .forEach((etiqueta) => cy.contains('label', etiqueta).should('be.visible'));
    });

    it('CP-UI-VH-02: al elegir Bicicleta cambian los campos y los soportes', () => {
      cy.get('#tipo_vehiculo').select('BICICLETA');
      cy.get('#numero_marco').should('be.visible');
      cy.get('#clase_bicicleta').should('be.visible');
      cy.get('#placa').should('not.exist');
      cy.contains('label', 'SOAT vigente').should('not.exist');
    });

    it('CP-UI-VH-03: con el formulario vacío muestra los errores y no envía nada', () => {
      cy.intercept('POST', '**/api/vehicle').as('crear');
      enviar();
      cy.contains('La marca es obligatoria.').should('be.visible');
      cy.contains('El color es obligatorio.').should('be.visible');
      cy.contains('Formato de placa inválido (ejemplo: ABC12G).').should('be.visible');
      cy.get('@crear.all').should('have.length', 0);
    });

    ['ABC123', 'AB12C', 'ABCD1E', '12ABCD'].forEach((placa) => it(`CP-UI-VH-04: placa "${placa}" con formato inválido se rechaza`, () => {
      cy.intercept('POST', '**/api/vehicle').as('crear');
      rellenarMoto({ placa });
      enviar();
      cy.contains('Formato de placa inválido').should('be.visible');
      cy.get('@crear.all').should('have.length', 0);
    }));

    it('CP-UI-VH-05: cilindraje y modelo fuera de rango se rechazan', () => {
      cy.intercept('POST', '**/api/vehicle').as('crear');
      rellenarMoto({ cilindraje: '49', modelo: '1969' });
      enviar();
      cy.contains('El cilindraje debe estar entre 50 y 2000 c.c.').should('be.visible');
      cy.contains('El modelo debe estar entre 1970 y').should('be.visible');
      cy.get('@crear.all').should('have.length', 0);
    });

    it('CP-UI-VH-06: bicicleta con marco corto y sin clase se rechaza', () => {
      cy.intercept('POST', '**/api/vehicle').as('crear');
      cy.get('#tipo_vehiculo').select('BICICLETA');
      cy.get('#marca').type('Trek');
      cy.get('#color').type('Azul');
      cy.get('#numero_marco').type('AB1');
      enviar();
      cy.contains('El número de marco debe tener al menos 5 caracteres.').should('be.visible');
      cy.contains('Seleccione la clase de bicicleta.').should('be.visible');
      cy.get('@crear.all').should('have.length', 0);
    });

    it('CP-UI-VH-07: registra una moto, vuelve a "Mis vehículos" y aparece en la lista', () => {
      cy.intercept('POST', '**/api/vehicle').as('crear');
      const placa = rellenarMoto();
      enviar();
      cy.wait('@crear').its('response.statusCode').should('eq', 201);
      cy.location('pathname').should('eq', '/vehiculos');
      cy.contains('tr', placa).within(() => {
        cy.contains('Motocicleta').should('be.visible');
        cy.contains('Honda').should('be.visible');
        cy.contains('150 c.c.').should('be.visible');
      });
    });

    it('CP-UI-VH-08: registra una bicicleta y aparece en la lista', () => {
      cy.intercept('POST', '**/api/vehicle').as('crear');
      const marco = `UI${Date.now()}`.slice(0, 12);
      cy.get('#tipo_vehiculo').select('BICICLETA');
      cy.get('#marca').type('Trek');
      cy.get('#color').type('Azul');
      cy.get('#numero_marco').type(marco);
      cy.get('#clase_bicicleta').select('Montaña');
      enviar();
      cy.wait('@crear').its('response.statusCode').should('eq', 201);
      cy.location('pathname').should('eq', '/vehiculos');
      cy.contains('tr', marco.toUpperCase()).within(() => {
        cy.contains('Bicicleta').should('be.visible');
        cy.contains('Montaña').should('be.visible');
      });
    });

    it('CP-UI-VH-09: registra una moto adjuntando la foto del vehículo', () => {
      cy.intercept('POST', '**/api/vehicle').as('crear');
      rellenarMoto();
      cy.get('#imagen_url_vehiculo').selectFile(
        { contents: Cypress.Buffer.from(imagenBytes('png')), fileName: 'foto.png', mimeType: 'image/png' },
      );
      cy.contains('Nuevo archivo: foto.png').should('be.visible');
      enviar();
      cy.wait('@crear').its('response.statusCode').should('eq', 201);
      cy.location('pathname').should('eq', '/vehiculos');
    });

    it('CP-UI-VH-10: si el servidor rechaza (placa duplicada) muestra el error y conserva el formulario', () => {
      nuevaMoto(otro).then(({ placa }) => {
        cy.intercept('POST', '**/api/vehicle').as('crear');
        rellenarMoto({ placa });
        enviar();
        cy.wait('@crear').its('response.statusCode').should('eq', 409);
        cy.get('.alert-danger').should('contain', 'El registro ya existe.');
        cy.location('pathname').should('eq', '/vehiculos/nuevo');
        cy.get('#placa').should('have.value', placa);
      });
    });

    it('CP-UI-VH-11: "Cancelar" vuelve al listado sin enviar nada', () => {
      cy.intercept('POST', '**/api/vehicle').as('crear');
      cy.contains('button', 'Cancelar').click();
      cy.location('pathname').should('eq', '/vehiculos');
      cy.get('@crear.all').should('have.length', 0);
    });

    it('CP-UI-VH-12: el INVITADO no puede entrar a /vehiculos/nuevo', () => {
      cy.uiLogin('invitado1');
      cy.visit('/vehiculos/nuevo');
      cy.location('pathname').should('eq', '/unauthorized');
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('HU-VH-02 · Consultar vehículos', () => {
  describe('API · GET /vehicle/me y GET /vehicle/:id', () => {
    it('CP-VH-17: aprendiz sin vehículos → 200 con lista vacía', () => {
      como(vacio, 'GET', '/vehicle/me').then((r) => { esperarOk(r); expect(r.body.datos).to.deep.equal([]); });
    });

    it('CP-VH-18: lista solo los vehículos propios, el más reciente primero', () => {
      nuevaMoto(duenio).then((primero) => nuevaBici(duenio).then((segundo) => nuevaMoto(otro).then((ajeno) => {
        como(duenio, 'GET', '/vehicle/me').then((r) => {
          esperarOk(r);
          const ids = r.body.datos.map((v) => v.id);
          expect(ids).to.include.members([primero.id, segundo.id]);
          expect(ids).to.not.include(ajeno.id);
          expect(ids.indexOf(segundo.id), 'el más reciente va antes').to.be.lessThan(ids.indexOf(primero.id));
        });
      })));
    });

    it('CP-VH-19: la moto trae detalles de moto y la bicicleta detalles de bicicleta, ambas con bloque de imágenes', () => {
      nuevaMoto(duenio).then((m) => nuevaBici(duenio).then((b) => {
        verVehiculo(duenio, m.id).then((v) => {
          expect(v.detalles).to.have.all.keys('placa', 'cilindraje', 'modelo', 'imagen_url_soat', 'imagen_url_tecnomecanica_vigente');
          expect(v.imagenes).to.have.all.keys(...IMAGENES_MOTO);
        });
        verVehiculo(duenio, b.id).then((v) => expect(v.detalles).to.have.all.keys('numero_marco', 'clase_bicicleta'));
      }));
    });

    it('CP-VH-20: el INVITADO puede consultar sus vehículos → 200', () => {
      cy.apiCall('invitado1', 'GET', '/vehicle/me').then((r) => {
        esperarOk(r);
        expect(r.body.datos).to.be.an('array').and.not.be.empty;
      });
    });

    ROLES_STAFF.forEach((rol) => [['GET', '/vehicle/me'], ['GET', '/vehicle/1']].forEach(([method, path]) =>
      it(`CP-VH-21: ${rol} no puede ${method} ${path} → 403`, () => {
        cy.apiCall(rol, method, path).then((r) => esperarError(r, 403, SIN_PERMISO));
      })));

    it('CP-VH-22: GET /vehicle/:id de un vehículo propio → 200', () => {
      nuevaMoto(duenio).then(({ id, marca }) => como(duenio, 'GET', `/vehicle/${id}`).then((r) => {
        esperarOk(r);
        expect(r.body.datos).to.include({ id, marca });
      }));
    });

    it('CP-VH-23: un vehículo ajeno → 404 (no revela que existe)', () => {
      nuevaMoto(otro).then(({ id }) => como(duenio, 'GET', `/vehicle/${id}`).then((r) => esperarError(r, 404, NO_ENCONTRADO)));
    });

    it('CP-VH-24: un vehículo inexistente → 404', () => {
      como(duenio, 'GET', `/vehicle/${INEXISTENTE}`).then((r) => esperarError(r, 404, NO_ENCONTRADO));
    });

    IDS_INVALIDOS.forEach((id) => it(`CP-VH-25: id inválido (${id}) → 400`, () => {
      como(duenio, 'GET', `/vehicle/${id}`).then((r) => esperarError(r, 400, ID_INVALIDO));
    }));

    it('CP-VH-26: sin token → 401', () => {
      cy.apiCall(null, 'GET', '/vehicle/me').then((r) => esperarError(r, 401, 'Token requerido.'));
    });
  });

  describe('Interfaz · /vehiculos y /vehiculos/:id', () => {
    it('CP-UI-VH-13: el aprendiz ve "Mis vehículos" con sus columnas y el botón de registrar', () => {
      nuevaMoto(duenio);
      uiLoginComo(duenio);
      cy.visit('/vehiculos');
      cy.contains('h2', 'Mis vehículos').should('be.visible');
      ['Tipo', 'Placa / N.° marco', 'Marca', 'Color', 'Detalle', 'Cupo', 'Acciones'].forEach((col) => cy.contains('th', col).should('be.visible'));
      cy.contains('a', 'Registrar vehículo').should('be.visible');
    });

    it('CP-UI-VH-14: sin vehículos muestra el mensaje de lista vacía', () => {
      uiLoginComo(vacio);
      cy.visit('/vehiculos');
      cy.contains('Aún no tiene vehículos matriculados').should('be.visible');
    });

    it('CP-UI-VH-15: cada fila muestra tipo, identificador, marca, color y detalle del vehículo', () => {
      nuevaMoto(duenio, { marca: 'Suzuki', color: 'Verde', cilindraje: 200, modelo: 2020 }).then(({ placa }) => {
        uiLoginComo(duenio);
        cy.visit('/vehiculos');
        cy.contains('tr', placa).within(() => {
          cy.contains('Motocicleta');
          cy.contains('Suzuki');
          cy.contains('Verde');
          cy.contains('200 c.c. · Modelo 2020');
        });
      });
    });

    it('CP-UI-VH-16: el buscador filtra por placa', () => {
      nuevaMoto(duenio).then((a) => nuevaMoto(duenio).then((b) => {
        uiLoginComo(duenio);
        cy.visit('/vehiculos');
        cy.get('input[placeholder="Buscar..."]').type(a.placa);
        cy.contains('tr', a.placa).should('exist');
        cy.contains('tr', b.placa).should('not.exist');
      }));
    });

    it('CP-UI-VH-17: "Consultar" abre el detalle en solo lectura', () => {
      nuevaMoto(duenio, { marca: 'Yamaha' }).then(({ id, placa }) => {
        uiLoginComo(duenio);
        cy.visit('/vehiculos');
        cy.contains('tr', placa).contains('a', 'Consultar').click();
        cy.location('pathname').should('eq', `/vehiculos/${id}`);
        cy.contains('h2', `Motocicleta · ${placa}`).should('be.visible');
        ['#tipo_vehiculo', '#marca', '#color', '#placa', '#cilindraje', '#modelo'].forEach((campo) => cy.get(campo).should('be.disabled'));
        cy.get('#marca').should('have.value', 'Yamaha');
        cy.contains('button', 'Guardar').should('not.exist');
        cy.contains('a', 'Editar').should('be.visible');
      });
    });

    it('CP-UI-VH-18: el detalle de un vehículo ajeno o inexistente muestra el aviso', () => {
      nuevaMoto(otro).then(({ id }) => {
        uiLoginComo(duenio);
        cy.visit(`/vehiculos/${id}`);
        cy.contains('No se encontró el vehículo solicitado.').should('be.visible');
        cy.visit(`/vehiculos/${INEXISTENTE}`);
        cy.contains('No se encontró el vehículo solicitado.').should('be.visible');
      });
    });

    it('CP-UI-VH-19: el INVITADO consulta pero no ve Registrar, Editar ni Eliminar', () => {
      cy.uiLogin('invitado1');
      cy.visit('/vehiculos');
      cy.contains('h2', 'Mis vehículos').should('be.visible');
      cy.contains('a', 'Consultar').should('be.visible');
      cy.contains('Registrar vehículo').should('not.exist');
      cy.contains('a', 'Editar').should('not.exist');
      cy.contains('button', 'Eliminar').should('not.exist');
    });

    ROLES_STAFF.forEach((rol) => it(`CP-UI-VH-20: ${rol} no puede entrar a /vehiculos`, () => {
      cy.uiLogin(rol);
      cy.visit('/vehiculos');
      cy.location('pathname').should('eq', '/unauthorized');
    }));

    it('CP-UI-VH-21: sin sesión, /vehiculos redirige al login', () => {
      cy.clearAllLocalStorage();
      cy.visit('/vehiculos');
      cy.location('pathname').should('eq', '/login');
    });

    defecto('CP-UI-VH-22: un cupo habilitado debe mostrarse como "Activo" en la lista (H-V1: la API manda estado_cupo 1 y la interfaz espera el texto "activo")', () => {
      nuevaMoto(duenio).then(({ id, placa }) => {
        activarCupo(duenio, id);
        uiLoginComo(duenio);
        cy.visit('/vehiculos');
        cy.contains('tr', placa).within(() => cy.contains(/^activo$/i).should('be.visible'));
      });
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('HU-VH-03 · Actualizar vehículo', () => {
  describe('API · PATCH /vehicle/:id', () => {
    const patch = (u, id, body, extra = {}) => como(u, 'PATCH', `/vehicle/${id}`, { body, ...extra });

    it('CP-VH-27: actualizar marca y color → 200 y la consulta lo refleja', () => {
      nuevaMoto(duenio).then(({ id }) => {
        patch(duenio, id, { marca: 'Kawasaki', color: 'Negro' }).then((r) => {
          esperarOk(r);
          expect(r.body.mensaje).to.eq('Vehículo actualizado; cupo pendiente de revisión.');
        });
        verVehiculo(duenio, id).then((v) => expect(v).to.include({ marca: 'Kawasaki', color: 'Negro' }));
      });
    });

    it('CP-VH-28: actualizar los detalles de una moto (placa, cilindraje, modelo)', () => {
      nuevaMoto(duenio).then(({ id }) => {
        const placa = placaUnica();
        patch(duenio, id, { placa, cilindraje: 300, modelo: 2024 }).then((r) => esperarOk(r));
        verVehiculo(duenio, id).then((v) => {
          expect(v.detalles.placa).to.eq(placa);
          expect(String(v.detalles.cilindraje)).to.eq('300');
          expect(String(v.detalles.modelo)).to.eq('2024');
        });
      });
    });

    it('CP-VH-29: actualizar los detalles de una bicicleta (marco y clase)', () => {
      nuevaBici(duenio).then(({ id }) => {
        const marco = `N${Date.now()}`;
        patch(duenio, id, { numero_marco: marco, clase_bicicleta: 'Ruta' }).then((r) => esperarOk(r));
        verVehiculo(duenio, id).then((v) => expect(v.detalles).to.deep.equal({ numero_marco: marco, clase_bicicleta: 'Ruta' }));
      });
    });

    it('CP-VH-30: tras editar, el cupo habilitado vuelve a quedar pendiente de revisión', () => {
      nuevaMoto(duenio).then(({ id }) => {
        activarCupo(duenio, id);
        verVehiculo(duenio, id).then((v) => expect(v.estado_cupo).to.eq(1));
        patch(duenio, id, { color: 'Gris' }).then((r) => esperarOk(r));
        verVehiculo(duenio, id).then((v) => expect(v.estado_cupo).to.eq(0));
      });
    });

    it('CP-VH-31: sin enviar imágenes conserva las actuales; con una nueva la reemplaza', () => {
      nuevaMoto(duenio, {}, [imagen('imagen_url_vehiculo', 'png')]).then(({ id }) => {
        verVehiculo(duenio, id).then((antes) => {
          patch(duenio, id, { color: 'Blanco' }).then((r) => esperarOk(r));
          verVehiculo(duenio, id).then((v) => expect(v.imagenes.imagen_url_vehiculo).to.eq(antes.imagenes.imagen_url_vehiculo));
          enviarMultipart(duenio.token, 'PATCH', `/vehicle/${id}`, {}, [imagen('imagen_url_vehiculo', 'jpg')]).then((r) => esperarOk(r));
          verVehiculo(duenio, id).then((v) => expect(v.imagenes.imagen_url_vehiculo).to.not.eq(antes.imagenes.imagen_url_vehiculo));
        });
      });
    });

    it('CP-VH-32: el tipo de vehículo no se puede cambiar', () => {
      nuevaMoto(duenio).then(({ id }) => {
        patch(duenio, id, { tipo_vehiculo: 'BICICLETA' }).then((r) => esperarOk(r));
        verVehiculo(duenio, id).then((v) => expect(v.tipo_vehiculo).to.eq('MOTO'));
      });
    });

    it('CP-VH-33: usar la placa de otro vehículo → 409 y no cambia nada', () => {
      nuevaMoto(otro).then((ajena) => nuevaMoto(duenio).then(({ id, placa }) => {
        patch(duenio, id, { placa: ajena.placa }).then((r) => esperarError(r, 409, 'El registro ya existe.'));
        verVehiculo(duenio, id).then((v) => expect(v.detalles.placa).to.eq(placa));
      }));
    });

    it('CP-VH-34: un vehículo ajeno → 404 y queda intacto', () => {
      nuevaMoto(otro).then(({ id, marca }) => {
        patch(duenio, id, { marca: 'Hackeada' }).then((r) => esperarError(r, 404, NO_ENCONTRADO));
        verVehiculo(otro, id).then((v) => expect(v.marca).to.eq(marca));
      });
    });

    it('CP-VH-35: un vehículo inexistente → 404', () => {
      patch(duenio, INEXISTENTE, { marca: 'X' }).then((r) => esperarError(r, 404, NO_ENCONTRADO));
    });

    IDS_INVALIDOS.forEach((id) => it(`CP-VH-36: id inválido (${id}) → 400`, () => {
      patch(duenio, id, { marca: 'X' }).then((r) => esperarError(r, 400, ID_INVALIDO));
    }));

    ROLES_STAFF.forEach((rol) => it(`CP-VH-37: ${rol} no puede editar vehículos → 403`, () => {
      cy.apiCall(rol, 'PATCH', '/vehicle/1', { body: { marca: 'X' } }).then((r) => esperarError(r, 403, SIN_PERMISO));
    }));

    it('CP-VH-38: soporte inválido al editar → 400 y el vehículo no cambia', () => {
      nuevaMoto(duenio).then(({ id, marca }) => {
        enviarMultipart(duenio.token, 'PATCH', `/vehicle/${id}`, { marca: 'Cambiada' }, [archivoPdf('imagen_url_vehiculo')])
          .then((r) => esperarError(r, 400, 'Solo se permiten imágenes JPG, PNG o WEBP.'));
        verVehiculo(duenio, id).then((v) => expect(v.marca).to.eq(marca));
      });
    });
  });

  describe('Interfaz · /vehiculos/:id/editar', () => {
    it('CP-UI-VH-23: el formulario llega precargado y el tipo no se puede cambiar', () => {
      nuevaMoto(duenio, { marca: 'Honda', color: 'Rojo' }).then(({ id, placa }) => {
        uiLoginComo(duenio);
        cy.visit(`/vehiculos/${id}/editar`);
        cy.contains('h2', 'Editar vehículo').should('be.visible');
        cy.get('#tipo_vehiculo').should('be.disabled').and('have.value', 'MOTO');
        cy.get('#marca').should('have.value', 'Honda');
        cy.get('#placa').should('have.value', placa);
        cy.contains('El tipo no se puede cambiar').should('be.visible');
      });
    });

    it('CP-UI-VH-24: edita el color, guarda y ve el cambio en el detalle', () => {
      nuevaMoto(duenio, { color: 'Rojo' }).then(({ id }) => {
        cy.intercept('PATCH', '**/api/vehicle/*').as('editar');
        uiLoginComo(duenio);
        cy.visit(`/vehiculos/${id}/editar`);
        cy.get('#color').clear().type('Verde');
        cy.contains('button', 'Guardar cambios').click();
        cy.wait('@editar').its('response.statusCode').should('eq', 200);
        cy.location('pathname').should('eq', `/vehiculos/${id}`);
        cy.get('#color').should('have.value', 'Verde');
      });
    });

    it('CP-UI-VH-25: al editar, un campo obligatorio vacío muestra el error y no envía', () => {
      nuevaMoto(duenio).then(({ id }) => {
        cy.intercept('PATCH', '**/api/vehicle/*').as('editar');
        uiLoginComo(duenio);
        cy.visit(`/vehiculos/${id}/editar`);
        cy.get('#marca').clear();
        cy.contains('button', 'Guardar cambios').click();
        cy.contains('La marca es obligatoria.').should('be.visible');
        cy.get('@editar.all').should('have.length', 0);
      });
    });

    it('CP-UI-VH-26: "Cancelar" vuelve al detalle sin guardar', () => {
      nuevaMoto(duenio).then(({ id }) => {
        cy.intercept('PATCH', '**/api/vehicle/*').as('editar');
        uiLoginComo(duenio);
        cy.visit(`/vehiculos/${id}/editar`);
        cy.contains('button', 'Cancelar').click();
        cy.location('pathname').should('eq', `/vehiculos/${id}`);
        cy.get('@editar.all').should('have.length', 0);
      });
    });

    it('CP-UI-VH-27: el INVITADO no puede entrar a la pantalla de edición', () => {
      cy.uiLogin('invitado1');
      cy.visit('/vehiculos/1/editar');
      cy.location('pathname').should('eq', '/unauthorized');
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('HU-VH-04 · Inactivar vehículo', () => {
  describe('API · PATCH /vehicle/:id/inactivar', () => {
    const inactivar = (u, id) => como(u, 'PATCH', `/vehicle/${id}/inactivar`);

    it('CP-VH-39: con cupo activo → 200 y el vehículo se conserva con el cupo inactivo', () => {
      nuevaMoto(duenio).then(({ id }) => {
        activarCupo(duenio, id);
        inactivar(duenio, id).then((r) => { esperarOk(r); expect(r.body.mensaje).to.eq('Vehículo inactivado.'); });
        verVehiculo(duenio, id).then((v) => expect(v.estado_cupo, 'se conserva el historial').to.eq(0));
      });
    });

    it('CP-VH-40: inactivar dos veces → 200 y luego 404', () => {
      nuevaMoto(duenio).then(({ id }) => {
        activarCupo(duenio, id);
        inactivar(duenio, id).then((r) => esperarOk(r));
        inactivar(duenio, id).then((r) => esperarError(r, 404, 'Vehículo no encontrado o ya estaba inactivo.'));
      });
    });

    it('CP-VH-41: un vehículo recién registrado (cupo pendiente) → 404 (caracterización)', () => {
      nuevaMoto(duenio).then(({ id }) => inactivar(duenio, id).then((r) => esperarError(r, 404, 'ya estaba inactivo')));
    });

    it('CP-VH-42: un vehículo ajeno → 404 y su cupo no cambia', () => {
      nuevaMoto(otro).then(({ id }) => {
        activarCupo(otro, id);
        inactivar(duenio, id).then((r) => esperarError(r, 404));
        verVehiculo(otro, id).then((v) => expect(v.estado_cupo).to.eq(1));
      });
    });

    IDS_INVALIDOS.forEach((id) => it(`CP-VH-43: id inválido (${id}) → 400`, () => {
      inactivar(duenio, id).then((r) => esperarError(r, 400, ID_INVALIDO));
    }));

    ROLES_STAFF.forEach((rol) => it(`CP-VH-44: ${rol} no puede inactivar vehículos → 403`, () => {
      cy.apiCall(rol, 'PATCH', '/vehicle/1/inactivar').then((r) => esperarError(r, 403, SIN_PERMISO));
    }));

    defecto('CP-VH-45: DELETE /vehicle/:id (la ruta que usa el botón "Eliminar" de la interfaz) debe inactivar el vehículo (H-V2: hoy responde 404 "Ruta no encontrada.")', () => {
      nuevaMoto(duenio).then(({ id }) => {
        activarCupo(duenio, id);
        como(duenio, 'DELETE', `/vehicle/${id}`).then((r) => esperarOk(r));
      });
    });
  });

  describe('Interfaz · botón "Eliminar" en /vehiculos', () => {
    it('CP-UI-VH-28: pide confirmación y, si se cancela, no envía ninguna petición', () => {
      nuevaMoto(duenio).then(({ placa }) => {
        cy.intercept('DELETE', '**/api/vehicle/*').as('borrar');
        cy.intercept('PATCH', '**/api/vehicle/*/inactivar').as('inactivar');
        cy.on('window:confirm', (texto) => {
          expect(texto).to.contain('¿Eliminar el vehículo');
          return false;
        });
        uiLoginComo(duenio);
        cy.visit('/vehiculos');
        cy.contains('tr', placa).contains('button', 'Eliminar').click();
        cy.get('@borrar.all').should('have.length', 0);
        cy.get('@inactivar.all').should('have.length', 0);
        cy.contains('tr', placa).should('exist');
      });
    });

    defecto('CP-UI-VH-29: confirmar "Eliminar" debe inactivar el vehículo y mostrar el mensaje de éxito (H-V2: la interfaz llama DELETE, que el backend no tiene)', () => {
      nuevaMoto(duenio).then(({ id, placa }) => {
        activarCupo(duenio, id);
        uiLoginComo(duenio);
        cy.visit('/vehiculos');
        cy.contains('tr', placa).contains('button', 'Eliminar').click(); // Cypress acepta el confirm por defecto
        cy.get('.alert-success').should('be.visible');
        verVehiculo(duenio, id).then((v) => expect(v.estado_cupo).to.eq(0));
      });
    });
  });
});