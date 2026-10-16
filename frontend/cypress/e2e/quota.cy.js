// Pruebas de caja negra del módulo quota: API (CP-QT) e interfaz (CP-UI-QT, menú y sesión).
import {
  INEXISTENTE,
  esperarError,
  esperarOk,
  vehiculoDe,
  fijarCupo,
  asegurarFuera,
  asegurarDentro,
} from '../support/helpers';

const IDS_INVALIDOS = ['abc', '0', '-1', '1.5'];

const SIN_PERMISO = 'No tiene permisos para esta operación.';

const a4 = Cypress.expose('seed')?.aprendiz4;

const hayA4 = !!(a4?.vehiculoA && a4?.vehiculoB);

const doc = (rol) => Cypress.expose('users')[rol].documento;

const buscar = (texto) => cy.get('input[placeholder="Buscar..."]').clear().type(texto);


// quota · API (CP-QT)

describe('Pruebas de Caja Negra - quota (API)', () => {
  before(() => {
    fijarCupo('aprendiz1', 1);
    fijarCupo('invitado1', 1);
    fijarCupo('aprendiz2', 0);
    asegurarFuera('aprendiz1');
    asegurarFuera('invitado1');
  });
  afterEach(() => {
    // Restablece la línea base de cupos tras cada prueba.
    fijarCupo('aprendiz1', 1);
    fijarCupo('aprendiz2', 0);
  });

  // ---------------------------------------------------------------- 8.2 GET /quota
  describe('GET /quota (listado)', () => {
    ['admin', 'jefe', 'celador'].forEach((rol) => it(`CP-QT-01: ${rol} lista cupos → 200 (página 1, límite 20)`, () => {
      cy.apiCall(rol, 'GET', '/quota').then((r) => {
        esperarOk(r);
        expect(r.body.pagina).to.eq(1);
        expect(r.body.limite).to.eq(20);
        expect(r.body.datos).to.be.an('array').and.have.length.of.at.most(20);
        if (r.body.datos[0]) {
          ['id_usuario', 'id_vehiculo', 'estado', 'estado_autorizacion', 'usuario', 'numero_documento',
            'tipo_vehiculo', 'marca', 'identificador_vehiculo'].forEach((k) => expect(r.body.datos[0]).to.have.property(k));
        }
      });
    }));
    it('CP-QT-02: estado_autorizacion coincide con estado (0 INACTIVO, 1 ACTIVO)', () => {
      cy.apiCall('admin', 'GET', '/quota', { qs: { limite: 100 } }).then((r) => {
        r.body.datos.forEach((d) => expect(d.estado_autorizacion).to.eq(d.estado === 1 ? 'ACTIVO' : 'INACTIVO'));
      });
    });
    it('CP-QT-03: cada cupo trae identificador (placa o número de marco)', () => {
      cy.apiCall('admin', 'GET', '/quota', { qs: { limite: 100 } }).then((r) => {
        r.body.datos.forEach((d) => { expect(d.tipo_vehiculo).to.be.oneOf(['MOTO', 'BICICLETA']); expect(d.identificador_vehiculo).to.be.a('string').and.not.be.empty; });
      });
    });
    it('CP-QT-04: administrador_auditor puede ser nulo sin error', () => {
      cy.apiCall('admin', 'GET', '/quota', { qs: { limite: 100 } }).then((r) => {
        esperarOk(r);
        r.body.datos.forEach((d) => expect(d).to.have.property('administrador_auditor'));
      });
    });
    it('CP-QT-05: paginación (límites y valores inválidos)', () => {
      cy.apiCall('admin', 'GET', '/quota', { qs: { limite: 1 } }).then((r) => { esperarOk(r); expect(r.body.datos).to.have.length.of.at.most(1); });
      cy.apiCall('admin', 'GET', '/quota', { qs: { limite: 100 } }).then((r) => esperarOk(r));
      cy.apiCall('admin', 'GET', '/quota', { qs: { limite: 101 } }).then((r) => esperarError(r, 400, 'limite no puede superar 100.'));
      ['0', '-1', 'abc'].forEach((v) => {
        cy.apiCall('admin', 'GET', '/quota', { qs: { pagina: v } }).then((r) => esperarError(r, 400, 'pagina debe ser un entero positivo.'));
        cy.apiCall('admin', 'GET', '/quota', { qs: { limite: v } }).then((r) => esperarError(r, 400, 'limite debe ser un entero positivo.'));
      });
    });
    it('CP-QT-06: el cupo modificado aparece primero', () => {
      cy.sesionApi('aprendiz2').then(({ id }) => vehiculoDe('aprendiz2').then((v) => {
        cy.apiCall('admin', 'PATCH', `/quota/${id}/${v}`, { body: { estado: 1 } }).then((p) => esperarOk(p));
        cy.apiCall('admin', 'GET', '/quota', { qs: { limite: 1 } }).then((r) => {
          expect(r.body.datos[0].id_usuario).to.eq(id);
          expect(r.body.datos[0].id_vehiculo).to.eq(v);
        });
      }));
    });
    ['aprendiz1', 'invitado1'].forEach((rol) => it(`CP-QT-07: ${rol} no puede listar → 403`, () => {
      cy.apiCall(rol, 'GET', '/quota').then((r) => esperarError(r, 403, SIN_PERMISO));
    }));
  });

  // ---------------------------------------------------------------- 8.3 /me y /usuario
  describe('GET /quota/me y /quota/usuario/:idUsuario', () => {
    it('CP-QT-08: aprendiz con cupo, fuera del parqueadero', () => {
      asegurarFuera('aprendiz1');
      cy.apiCall('aprendiz1', 'GET', '/quota/me').then((r) => {
        esperarOk(r);
        expect(r.body.vehiculo).to.include.keys('id_vehiculo', 'estado_cupo', 'tipo_vehiculo', 'marca', 'color');
        expect(r.body.vehiculoEnParqueadero).to.eq(false);
        expect(r.body.idEntradaAbierta).to.eq(null);
      });
    });
    it('CP-QT-09: invitado con entrada abierta → vehiculoEnParqueadero true', () => {
      asegurarDentro('invitado1').then((idEntrada) => {
        cy.apiCall('invitado1', 'GET', '/quota/me').then((r) => {
          expect(r.body.vehiculoEnParqueadero).to.eq(true);
          expect(r.body.idEntradaAbierta).to.eq(idEntrada);
        });
      });
      asegurarFuera('invitado1');
    });
    it('CP-QT-10: usuario sin cupo → vehiculo null', () => {
      cy.apiCall('aprendiz3', 'GET', '/quota/me').then((r) => {
        esperarOk(r);
        expect(r.body.vehiculo).to.eq(null);
        expect(r.body.vehiculoEnParqueadero).to.eq(false);
        expect(r.body.idEntradaAbierta).to.eq(null);
      });
    });
    it('CP-QT-11: cupo inactivo → estado_cupo 0', () => {
      cy.apiCall('aprendiz2', 'GET', '/quota/me').then((r) => expect(r.body.vehiculo.estado_cupo).to.eq(0));
    });
    (hayA4 ? it : it.skip)('CP-QT-12: usuario con dos cupos recibe uno de ellos (requiere seed.aprendiz4)', () => {
      cy.apiCall('aprendiz4', 'GET', '/quota/me').then((r) => {
        esperarOk(r);
        expect(r.body.vehiculo.id_vehiculo).to.be.oneOf([a4.vehiculoA, a4.vehiculoB]);
      });
    });
    ['admin', 'jefe', 'celador'].forEach((rol) => it(`CP-QT-13: ${rol} puede usar /me → 200`, () => {
      cy.apiCall(rol, 'GET', '/quota/me').then((r) => { esperarOk(r); expect(r.body).to.have.property('vehiculo'); });
    }));
    it('CP-QT-14: aprendiz consulta su propio cupo por id → 200', () => {
      cy.sesionApi('aprendiz1').then(({ id }) => cy.apiCall('aprendiz1', 'GET', `/quota/usuario/${id}`).then((r) => esperarOk(r)));
    });
    it('CP-QT-15: aprendiz/invitado no consultan cupos ajenos → 403', () => {
      cy.sesionApi('invitado1').then((inv) => cy.apiCall('aprendiz1', 'GET', `/quota/usuario/${inv.id}`).then((r) => esperarError(r, 403, SIN_PERMISO)));
      cy.sesionApi('aprendiz1').then((apr) => cy.apiCall('invitado1', 'GET', `/quota/usuario/${apr.id}`).then((r) => esperarError(r, 403, SIN_PERMISO)));
    });
    ['celador', 'jefe', 'admin'].forEach((rol) => it(`CP-QT-16: ${rol} consulta cualquier usuario → 200`, () => {
      cy.sesionApi('aprendiz1').then(({ id }) => cy.apiCall(rol, 'GET', `/quota/usuario/${id}`).then((r) => esperarOk(r)));
    }));
    IDS_INVALIDOS.forEach((v) => it(`CP-QT-17: idUsuario=${v} → 400`, () => {
      cy.apiCall('celador', 'GET', `/quota/usuario/${v}`).then((r) => esperarError(r, 400, 'idUsuario debe ser un entero positivo.'));
    }));
    it('CP-QT-18: usuario inexistente con rol privilegiado → 200 con vehiculo null', () => {
      cy.apiCall('admin', 'GET', `/quota/usuario/${INEXISTENTE}`).then((r) => { esperarOk(r); expect(r.body.vehiculo).to.eq(null); });
    });
  });

  // ---------------------------------------------------------------- 8.3.1 /detalle
  describe('GET /quota/detalle/:idUsuario/:idVehiculo', () => {
    const detalle = (rol, u, v) => cy.apiCall(rol, 'GET', `/quota/detalle/${u}/${v}`);

    it('CP-QT-19: par válido con rol privilegiado → 200 con todos los bloques', () => {
      cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        detalle('celador', id, v).then((r) => {
          esperarOk(r);
          ['usuario', 'numero_documento', 'estado', 'estado_autorizacion', 'tipo_vehiculo', 'marca', 'color',
            'identificador_vehiculo', 'idEntradaAbierta'].forEach((k) => expect(r.body.datos).to.have.property(k));
        });
      }));
    });
    it('CP-QT-20: con entrada abierta devuelve su id', () => {
      asegurarDentro('aprendiz1').then((idEntrada) => cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        detalle('admin', id, v).then((r) => expect(r.body.datos.idEntradaAbierta).to.eq(idEntrada));
      })));
      asegurarFuera('aprendiz1');
    });
    it('CP-QT-21: sin entrada abierta → idEntradaAbierta null', () => {
      asegurarFuera('aprendiz1');
      cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        detalle('admin', id, v).then((r) => expect(r.body.datos.idEntradaAbierta).to.eq(null));
      }));
    });
    it('CP-QT-22: par sin cupo → 404', () => {
      cy.sesionApi('aprendiz3').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        detalle('admin', id, v).then((r) => esperarError(r, 404, 'Autorización no encontrada.'));
      }));
    });
    it('CP-QT-23: aprendiz ve el par propio (200) pero no el ajeno (403)', () => {
      cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('aprendiz1').then((v) => detalle('aprendiz1', id, v).then((r) => esperarOk(r))));
      cy.sesionApi('invitado1').then(({ id }) => vehiculoDe('invitado1').then((v) => detalle('aprendiz1', id, v).then((r) => esperarError(r, 403, SIN_PERMISO))));
    });
    IDS_INVALIDOS.forEach((v) => {
      it(`CP-QT-24: idUsuario=${v} → 400`, () => detalle('admin', v, 1).then((r) => esperarError(r, 400, 'idUsuario debe ser un entero positivo.')));
      it(`CP-QT-24: idVehiculo=${v} → 400`, () => detalle('admin', 1, v).then((r) => esperarError(r, 400, 'idVehiculo debe ser un entero positivo.')));
    });
    it('CP-QT-25: invitado no tiene ficha ni centro', () => {
      cy.sesionApi('invitado1').then(({ id }) => vehiculoDe('invitado1').then((v) => {
        detalle('admin', id, v).then((r) => { expect(r.body.datos.ficha).to.eq(null); expect(r.body.datos.nombre_centro).to.eq(null); });
      }));
    });
  });

  // ---------------------------------------------------------------- 8.4 PATCH
  describe('PATCH /quota/:idUsuario/:idVehiculo', () => {
    const patch = (rol, u, v, body) => cy.apiCall(rol, 'PATCH', `/quota/${u}/${v}`, body === undefined ? {} : { body });

    it('CP-QT-26: deshabilitar cupo activo → 200 y queda auditado', () => {
      cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        patch('admin', id, v, { estado: 0 }).then((r) => { esperarOk(r); expect(r.body.mensaje).to.eq('Cupo deshabilitado.'); });
        cy.apiCall('admin', 'GET', `/quota/detalle/${id}/${v}`).then((d) => {
          expect(d.body.datos.estado).to.eq(0);
          expect(d.body.datos.estado_autorizacion).to.eq('INACTIVO');
          expect(d.body.datos.administrador_auditor).to.be.a('string');
        });
      }));
    });
    it('CP-QT-27: habilitar cupo inactivo → 200', () => {
      cy.sesionApi('aprendiz2').then(({ id }) => vehiculoDe('aprendiz2').then((v) => {
        patch('admin', id, v, { estado: 1 }).then((r) => { esperarOk(r); expect(r.body.mensaje).to.eq('Cupo habilitado.'); });
        cy.apiCall('admin', 'GET', `/quota/detalle/${id}/${v}`).then((d) => expect(d.body.datos.estado).to.eq(1));
      }));
    });
    (hayA4 ? it : it.skip)('CP-QT-28: activar un cupo desactiva los demás del usuario (requiere seed.aprendiz4)', () => {
      cy.sesionApi('aprendiz4').then(({ id }) => {
        patch('admin', id, a4.vehiculoA, { estado: 1 }).then((r) => esperarOk(r));
        patch('admin', id, a4.vehiculoB, { estado: 1 }).then((r) => esperarOk(r));
        cy.apiCall('admin', 'GET', `/quota/detalle/${id}/${a4.vehiculoA}`).then((d) => expect(d.body.datos.estado).to.eq(0));
        cy.apiCall('admin', 'GET', `/quota/detalle/${id}/${a4.vehiculoB}`).then((d) => expect(d.body.datos.estado).to.eq(1));
      });
    });
    it('CP-QT-29: habilitar un cupo ya activo es idempotente', () => {
      cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        patch('admin', id, v, { estado: 1 }).then((r) => esperarOk(r));
        cy.apiCall('admin', 'GET', `/quota/detalle/${id}/${v}`).then((d) => expect(d.body.datos.estado).to.eq(1));
      }));
    });
    it('CP-QT-30: deshabilitar un cupo ya inactivo es idempotente', () => {
      cy.sesionApi('aprendiz2').then(({ id }) => vehiculoDe('aprendiz2').then((v) => {
        patch('admin', id, v, { estado: 0 }).then((r) => esperarOk(r));
      }));
    });
    it('CP-QT-31: deshabilitar con entrada abierta bloquea nuevas entradas pero permite la salida', () => {
      asegurarDentro('aprendiz1').then((idEntrada) => cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        patch('admin', id, v, { estado: 0 }).then((r) => esperarOk(r));
        cy.apiCall('celador', 'POST', '/input_output/entrada', { body: { id_usuario_entra: id, id_vehiculo: v } })
          .then((r) => expect(r.status).to.be.oneOf([403, 409]));
        cy.apiCall('celador', 'PATCH', `/input_output/salida/${idEntrada}`, { body: {} }).then((r) => esperarOk(r));
        patch('admin', id, v, { estado: 1 });
        cy.apiCall('celador', 'POST', '/input_output/entrada', { body: { id_usuario_entra: id, id_vehiculo: v } }).then((r) => esperarOk(r, 201));
      })));
      asegurarFuera('aprendiz1');
    });
    it('CP-QT-32: estado ausente → 400', () => {
      cy.sesionApi('aprendiz2').then(({ id }) => vehiculoDe('aprendiz2').then((v) => {
        patch('admin', id, v, {}).then((r) => esperarError(r, 400, 'estado debe ser 0 o 1.'));
      }));
    });
    [2, -1, 'abc', 1.5].forEach((valor) => it(`CP-QT-33: estado=${valor} → 400`, () => {
      cy.sesionApi('aprendiz2').then(({ id }) => vehiculoDe('aprendiz2').then((v) => {
        patch('admin', id, v, { estado: valor }).then((r) => esperarError(r, 400, 'estado debe ser 0 o 1.'));
      }));
    }));
    [null, '', false, '1', true].forEach((valor) => it(`CP-QT-34: estado=${JSON.stringify(valor)} se documenta (H-05)`, () => {
      cy.sesionApi('aprendiz2').then(({ id }) => vehiculoDe('aprendiz2').then((v) => {
        patch('admin', id, v, { estado: valor }).then((r) => {
          cy.log(`estado=${JSON.stringify(valor)} → HTTP ${r.status}`);
          expect(r.status).to.be.oneOf([200, 400]);
        });
      }));
    }));
    it('CP-QT-35: par inexistente con estado=0 → 404', () => {
      cy.sesionApi('aprendiz3').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        patch('admin', id, v, { estado: 0 }).then((r) => esperarError(r, 404, 'Cupo no encontrado.'));
      }));
    });
    it('CP-QT-36: par inexistente con estado=1 → 404 y no altera los cupos activos del usuario (H-04)', () => {
      cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('invitado1').then((vAjeno) => {
        patch('admin', id, vAjeno, { estado: 1 }).then((r) => esperarError(r, 404, 'Cupo no encontrado.'));
        cy.apiCall('aprendiz1', 'GET', '/quota/me').then((m) => expect(m.body.vehiculo.estado_cupo, 'cupo de aprendiz1 intacto').to.eq(1));
      }));
    });
    IDS_INVALIDOS.forEach((v) => it(`CP-QT-37: ids inválidos (${v}) → 400`, () => {
      patch('admin', v, 1, { estado: 1 }).then((r) => esperarError(r, 400, 'idUsuario debe ser un entero positivo.'));
      patch('admin', 1, v, { estado: 1 }).then((r) => esperarError(r, 400, 'idVehiculo debe ser un entero positivo.'));
    }));
    ['jefe', 'celador', 'aprendiz1', 'invitado1'].forEach((rol) => it(`CP-QT-38: ${rol} no puede cambiar el estado → 403`, () => {
      patch(rol, 1, 1, { estado: 0 }).then((r) => esperarError(r, 403, SIN_PERMISO));
    }));
    (hayA4 ? it : it.skip)('CP-QT-39: dos activaciones simultáneas dejan como máximo un cupo activo (requiere seed.aprendiz4)', () => {
      cy.sesionApi('aprendiz4').then(({ id }) => {
        cy.apiParalelo('admin', [
          { method: 'PATCH', path: `/quota/${id}/${a4.vehiculoA}`, body: { estado: 1 } },
          { method: 'PATCH', path: `/quota/${id}/${a4.vehiculoB}`, body: { estado: 1 } },
        ]);
        cy.apiCall('admin', 'GET', `/quota/detalle/${id}/${a4.vehiculoA}`).then((a) => cy.apiCall('admin', 'GET', `/quota/detalle/${id}/${a4.vehiculoB}`).then((b) => {
          expect(a.body.datos.estado + b.body.datos.estado, 'cupos activos').to.be.at.most(1);
        }));
      });
    });
  });
});

// quota · Interfaz (CP-UI-QT, CP-UI-GEN)

describe('Pruebas de Caja Negra - quota (UI)', () => {
  before(() => { fijarCupo('aprendiz1', 1); fijarCupo('aprendiz2', 0); asegurarFuera('aprendiz1'); });
  afterEach(() => { fijarCupo('aprendiz1', 1); fijarCupo('aprendiz2', 0); });

  describe('Listado /cupos', () => {
    it('CP-UI-QT-01: ADMIN ve la tabla con botones Habilitar/Deshabilitar', () => {
      cy.uiLogin('admin');
      cy.visit('/cupos');
      cy.contains('h2', 'Autorizaciones de vehículos');
      cy.get('tbody tr').should('have.length.at.least', 1);
      cy.get('tbody').contains('button', /Habilitar|Deshabilitar/);
    });
    ['jefe', 'celador'].forEach((rol) => it(`CP-UI-QT-02: ${rol} ve la tabla sin botones de estado`, () => {
      cy.uiLogin(rol);
      cy.visit('/cupos');
      cy.contains('h2', 'Autorizaciones de vehículos');
      cy.get('tbody').contains('a', 'Consultar más a detalle');
      cy.contains('button', /^(Habilitar|Deshabilitar)$/).should('not.exist');
    }));
    it('CP-UI-QT-03: ADMIN deshabilita un cupo sin recargar', () => {
      cy.uiLogin('admin');
      cy.visit('/cupos');
      buscar(doc('aprendiz1'));
      cy.get('tbody tr').first().within(() => {
        cy.contains('button', 'Deshabilitar').click();
        cy.contains('td', 'INACTIVO');
        cy.contains('button', 'Habilitar');
      });
    });
    it('CP-UI-QT-04: ADMIN habilita un cupo', () => {
      cy.uiLogin('admin');
      cy.visit('/cupos');
      buscar(doc('aprendiz2'));
      cy.get('tbody tr').first().within(() => {
        cy.contains('button', 'Habilitar').click();
        cy.contains('td', 'ACTIVO');
        cy.contains('button', 'Deshabilitar');
      });
    });
    it('CP-UI-QT-05: error del servidor al cambiar estado deja la fila sin cambios', () => {
      cy.intercept('PATCH', '**/quota/*/*', { statusCode: 500, body: { ok: false, mensaje: 'Fallo simulado' } });
      cy.uiLogin('admin');
      cy.visit('/cupos');
      buscar(doc('aprendiz1'));
      cy.get('tbody tr').first().within(() => cy.contains('button', 'Deshabilitar').click());
      cy.get('.text-danger').should('contain', 'Fallo simulado');
      cy.get('tbody tr').first().should('contain', 'ACTIVO');
    });
  });

  describe('Detalle /cupos/:idUsuario/:idVehiculo', () => {
    const ir = (rol, query = '') => cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
      cy.uiLogin(rol);
      cy.visit(`/cupos/${id}/${v}${query}`);
    }));

    it('CP-UI-QT-06: muestra datos del usuario, estado y detalle del vehículo', () => {
      ir('celador');
      cy.contains('h2', 'Detalle de autorización');
      ['Usuario', 'Documento', 'Ficha', 'Centro', 'Estado', 'Administrador auditor'].forEach((t) => cy.contains('dt', t));
      cy.contains('h3', 'Vehículo y detalle técnico');
    });
    it('CP-UI-QT-07: botón "Registrar operación" solo con ?origen=entradas', () => {
      ir('celador', '?origen=entradas');
      cy.contains('a', 'Registrar operación');
      ir('celador');
      cy.contains('a', 'Registrar operación').should('not.exist');
    });
    it('CP-UI-QT-08: ids no numéricos muestran el aviso', () => {
      cy.uiLogin('admin');
      cy.visit('/cupos/abc/xyz');
      cy.get('.alert-danger').should('contain', 'La autorización requiere identificadores numéricos válidos.');
    });
    it('CP-UI-QT-09: par inexistente muestra error', () => {
      cy.sesionApi('aprendiz3').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        cy.uiLogin('admin');
        cy.visit(`/cupos/${id}/${v}`);
        cy.get('.alert-danger').should('contain', 'Autorización no encontrada.');
      }));
    });
    it('CP-UI-QT-09b: ADMIN ve el botón para cambiar el estado del cupo', () => {
      ir('admin');
      cy.contains('button', /^(Habilitar|Deshabilitar)$/);
    });
  });

  describe('Mi cupo /mi-cupo', () => {
    it('CP-UI-QT-10: aprendiz con cupo ve tipo, marca y estado', () => {
      cy.uiLogin('aprendiz1');
      cy.visit('/mi-cupo');
      cy.contains('h2', 'Mi cupo');
      ['Tipo', 'Marca', 'Estado'].forEach((t) => cy.contains('dt', t));
      cy.contains('dt', 'Estado').next('dd').should('contain', 'Activo');
    });
    it('CP-UI-QT-11: usuario sin cupo ve el mensaje vacío', () => {
      cy.uiLogin('aprendiz3');
      cy.visit('/mi-cupo');
      cy.contains('No hay vehículo asociado.');
    });
    ['admin', 'jefe', 'celador'].forEach((rol) => it(`CP-UI-QT-12: ${rol} no accede a /mi-cupo`, () => {
      cy.uiLogin(rol);
      cy.visit('/mi-cupo');
      cy.location('pathname').should('eq', '/unauthorized');
    }));
    ['aprendiz1', 'invitado1'].forEach((rol) => it(`CP-UI-QT-12b: ${rol} no accede a /cupos`, () => {
      cy.uiLogin(rol);
      cy.visit('/cupos');
      cy.location('pathname').should('eq', '/unauthorized');
    }));
  });

  describe('Menú principal (tarjetas por rol)', () => {
    const casos = {
      admin: { si: ['/cupos'], no: ['/entradas-salidas'] },
      jefe: { si: ['/cupos', '/entradas-salidas'], no: [] },
      celador: { si: ['/cupos', '/entradas-salidas'], no: [] },
      aprendiz1: { si: ['/entradas-salidas'], no: ['/cupos'] },
      invitado1: { si: ['/entradas-salidas'], no: ['/cupos'] },
    };
    Object.entries(casos).forEach(([rol, { si, no }]) => it(`CP-UI-QT-13: opciones visibles para ${rol}`, () => {
      cy.uiLogin(rol);
      cy.visit('/');
      si.forEach((href) => cy.get(`a[href="${href}"]`).should('exist'));
      no.forEach((href) => cy.get(`a[href="${href}"]`).should('not.exist'));
    }));
  });

  describe('Sesión', () => {
    it('CP-UI-GEN-01: sin sesión, una ruta protegida redirige a /login', () => {
      cy.clearAllLocalStorage();
      cy.visit('/cupos');
      cy.location('pathname').should('eq', '/login');
    });
    it('CP-UI-GEN-02: el formulario de login permite entrar y llegar a Cupos', () => {
      const { documento, password } = Cypress.expose('users').admin;
      cy.clearAllLocalStorage();
      cy.visit('/login');
      cy.get('#documento').type(documento);
      cy.get('#password').type(password, { log: false });
      cy.contains('button', 'Iniciar Sesión').click();
      cy.location('pathname').should('eq', '/');
      cy.visit('/cupos');
      cy.contains('h2', 'Autorizaciones de vehículos');
    });
    it('CP-UI-GEN-03: credenciales incorrectas muestran el error', () => {
      cy.clearAllLocalStorage();
      cy.visit('/login');
      cy.get('#documento').type('0000000');
      cy.get('#password').type('incorrecta-123');
      cy.contains('button', 'Iniciar Sesión').click();
      cy.get('.alert-danger').should('contain', 'Credenciales inválidas.');
    });
  });
});