// Pruebas de caja negra TRANSVERSALES: afectan a input_output y quota a la vez (generales CP-GEN e integración CP-INT).
import {
  esperarError,
  esperarOk,
  vehiculoDe,
  fijarCupo,
  asegurarFuera,
  asegurarDentro,
  crearInvitado,
} from '../support/helpers';

const SIN_PERMISO = 'No tiene permisos para esta operación.';

const a4 = Cypress.expose('seed')?.aprendiz4;

const hayA4 = !!(a4?.vehiculoA && a4?.vehiculoB);

const ENDPOINTS = [
  ['GET', '/input_output'], ['GET', '/input_output/me'], ['GET', '/input_output/1'],
  ['POST', '/input_output/entrada'], ['PATCH', '/input_output/salida/1'], ['POST', '/input_output/invitado'],
  ['GET', '/quota'], ['GET', '/quota/me'], ['GET', '/quota/usuario/1'],
  ['GET', '/quota/detalle/1/1'], ['PATCH', '/quota/1/1'],
];


describe('Pruebas de Caja Negra - Generales (autenticación, permisos y errores)', () => {
  ENDPOINTS.forEach(([method, path]) => {
    it(`CP-GEN-01: sin token → 401 en ${method} ${path}`, () => {
      cy.apiCall(null, method, path).then((r) => esperarError(r, 401, 'Token requerido.'));
    });
    it(`CP-GEN-02: esquema distinto de Bearer → 401 en ${method} ${path}`, () => {
      cy.apiCall(null, method, path, { auth: 'Basic abc123' }).then((r) => esperarError(r, 401, 'Token requerido.'));
    });
    it(`CP-GEN-03: token con formato inválido → 401 en ${method} ${path}`, () => {
      cy.apiCall(null, method, path, { auth: 'Bearer abc.def.ghi' })
        .then((r) => esperarError(r, 401, 'Token inválido o expirado.'));
    });
  });

  it('CP-GEN-03b: token con firma alterada → 401', () => {
    cy.sesionApi('celador').then((s) => {
      cy.apiCall(null, 'GET', '/quota', { auth: `Bearer ${s.token}x` })
        .then((r) => esperarError(r, 401, 'Token inválido o expirado.'));
    });
  });

  (Cypress.expose('tokenExpirado') ? it : it.skip)('CP-GEN-03c: token expirado → 401 (requiere env.tokenExpirado)', () => {
    cy.apiCall(null, 'GET', '/quota', { auth: `Bearer ${Cypress.expose('tokenExpirado')}` })
      .then((r) => esperarError(r, 401, 'Token inválido o expirado.'));
  });

  ['/input_output/x/y/z', '/quota/a/b/c/d'].forEach((path) => {
    it(`CP-GEN-04: ruta inexistente ${path} → 404`, () => {
      cy.apiCall('celador', 'GET', path).then((r) => esperarError(r, 404, 'Ruta no encontrada.'));
    });
  });

  it('CP-GEN-05: /api y /api/web/v1 responden igual', () => {
    const web = `${Cypress.expose('apiUrl')}/web/v1`;
    cy.apiCall('aprendiz1', 'GET', '/quota/me').then((a) => {
      cy.apiCall('aprendiz1', 'GET', '/quota/me', { baseUrl: web }).then((b) => {
        expect(b.status).to.eq(a.status);
        expect(b.body).to.deep.equal(a.body);
      });
    });
    cy.apiCall('celador', 'GET', '/input_output').then((a) => {
      cy.apiCall('celador', 'GET', '/input_output', { baseUrl: web }).then((b) => {
        expect(b.status).to.eq(200);
        expect(b.body.total).to.eq(a.body.total);
      });
    });
  });

  [
    ['aprendiz1', 'POST', '/input_output/entrada'],
    ['invitado1', 'PATCH', '/input_output/salida/1'],
    ['jefe', 'POST', '/input_output/invitado'],
    ['admin', 'POST', '/input_output/entrada'],
    ['aprendiz1', 'GET', '/quota'],
    ['celador', 'PATCH', '/quota/1/1'],
  ].forEach(([rol, method, path]) => {
    it(`CP-GEN-06: ${rol} no puede ${method} ${path} → 403`, () => {
      cy.apiCall(rol, method, path, { body: { estado: 1 } }).then((r) => esperarError(r, 403, SIN_PERMISO));
    });
  });

  [
    ['celador', 'POST', '/input_output/entrada', {}],
    ['celador', 'GET', '/input_output?limite=999'],
    ['admin', 'PATCH', '/quota/1/1', { estado: 9 }],
    ['aprendiz1', 'GET', '/input_output/abc'],
    ['celador', 'GET', '/quota/usuario/abc'],
  ].forEach(([rol, method, path, body]) => {
    it(`CP-GEN-07: error de validación en ${method} ${path} no devuelve 500`, () => {
      cy.apiCall(rol, method, path, body ? { body } : {}).then((r) => {
        expect(r.status).to.be.within(400, 499);
        expect(r.body.ok).to.eq(false);
        expect(r.body.mensaje).to.be.a('string');
      });
    });
  });
});

// INTEGRACIÓN input_output ↔ quota (CP-INT)

describe('Pruebas de Caja Negra - Integración input_output ↔ quota (API)', () => {
  before(() => { fijarCupo('aprendiz1', 1); asegurarFuera('aprendiz1'); });
  afterEach(() => { fijarCupo('aprendiz1', 1); asegurarFuera('aprendiz1'); });

  const entrada = () => cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('aprendiz1').then((v) =>
    cy.apiCall('celador', 'POST', '/input_output/entrada', { body: { id_usuario_entra: id, id_vehiculo: v } })));

  it('CP-INT-01: deshabilitar el cupo y registrar entrada → 403', () => {
    fijarCupo('aprendiz1', 0);
    entrada().then((r) => esperarError(r, 403, 'El usuario no tiene un cupo activo para ese vehículo.'));
  });

  it('CP-INT-02: habilitar el cupo y registrar entrada → 201 y /quota/me lo refleja', () => {
    fijarCupo('aprendiz1', 0);
    fijarCupo('aprendiz1', 1);
    entrada().then((r) => esperarOk(r, 201));
    cy.apiCall('aprendiz1', 'GET', '/quota/me').then((m) => {
      expect(m.body.vehiculoEnParqueadero).to.eq(true);
      expect(m.body.idEntradaAbierta).to.be.a('number');
    });
  });

  it('CP-INT-03: registrar la salida actualiza /quota/me', () => {
    asegurarDentro('aprendiz1').then((id) => {
      cy.apiCall('celador', 'PATCH', `/input_output/salida/${id}`, { body: {} }).then((r) => esperarOk(r));
      cy.apiCall('aprendiz1', 'GET', '/quota/me').then((m) => {
        expect(m.body.vehiculoEnParqueadero).to.eq(false);
        expect(m.body.idEntradaAbierta).to.eq(null);
      });
    });
  });

  it('CP-INT-04: registrar invitado crea cupo ACTIVO y entrada DENTRO', () => {
    crearInvitado().then((g) => {
      cy.apiCall('admin', 'GET', `/quota/detalle/${g.id_usuario}/${g.id_vehiculo}`).then((d) => {
        esperarOk(d);
        expect(d.body.datos.estado_autorizacion).to.eq('ACTIVO');
        expect(d.body.datos.idEntradaAbierta).to.be.a('number');
      });
      cy.apiCall('celador', 'GET', '/input_output', { qs: { id_usuario: g.id_usuario, estado: 'DENTRO' } }).then((l) => {
        expect(l.body.datos).to.have.length(1);
        expect(l.body.datos[0].id_vehiculo).to.eq(g.id_vehiculo);
      });
    });
  });

  (hayA4 ? it : it.skip)('CP-INT-05: activar otro cupo con un vehículo dentro (caracterización, requiere seed.aprendiz4)', () => {
    cy.sesionApi('aprendiz4').then(({ id }) => {
      cy.apiCall('admin', 'PATCH', `/quota/${id}/${a4.vehiculoA}`, { body: { estado: 1 } });
      cy.apiCall('celador', 'POST', '/input_output/entrada', { body: { id_usuario_entra: id, id_vehiculo: a4.vehiculoA } });
      cy.apiCall('admin', 'PATCH', `/quota/${id}/${a4.vehiculoB}`, { body: { estado: 1 } }).then((r) => esperarOk(r));
      cy.apiCall('admin', 'GET', `/quota/detalle/${id}/${a4.vehiculoA}`).then((d) => {
        cy.log(`Cupo A tras activar B → estado ${d.body.datos.estado}, entrada abierta ${d.body.datos.idEntradaAbierta}`);
        expect(d.status).to.eq(200);
        // Si hay entrada abierta, la salida debe seguir siendo posible aunque el cupo esté inactivo.
        if (d.body.datos.idEntradaAbierta) {
          cy.apiCall('celador', 'PATCH', `/input_output/salida/${d.body.datos.idEntradaAbierta}`, { body: {} }).then((s) => esperarOk(s));
        }
      });
    });
  });
});