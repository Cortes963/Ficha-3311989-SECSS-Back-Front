// Pruebas de caja negra del módulo input_output, organizadas por historia de usuario:
import {
  GENERICA,
  INEXISTENTE,
  imagen,
  imagenGrande,
  archivoPdf,
  imagenMimeFalso,

  pasado,
  invitadoBase,
  esperarError,
  esperarOk,
  vehiculoDe,
  fijarCupo,
  asegurarFuera,
  asegurarDentro,
  registroCerrado,
  crearInvitado,
  crearAprendiz,
  refrescarCupo,
} from '../support/helpers';

const IDS_INVALIDOS = ['abc', '0', '-1', '1.5'];
const SIN_CUPO = 'El usuario no tiene un cupo activo para ese vehículo.';
const TRES_IMAGENES = ['imagen_url_vehiculo', 'imagen_url_identificacion_vehiculo', 'imagen_url_tarjeta_propiedad'];

const doc = (rol) => Cypress.expose('users')[rol].documento;
const seleccionarCupo = (rol) => {
  cy.get('#cupo').clear().type(doc(rol));
  cy.get('.list-group-item-action').first().click();
};

/** Línea base compartida por todas las pruebas del módulo. */
const prepararBase = () => {
  fijarCupo('aprendiz1', 1);
  fijarCupo('invitado1', 1);
  fijarCupo('aprendiz2', 0);
  asegurarFuera('aprendiz1');
  asegurarFuera('invitado1');
};
const dejarTodoFuera = () => { asegurarFuera('aprendiz1'); asegurarFuera('invitado1'); };

/** Tras operar, la lista /entradas-salidas debe tener primero el registro más reciente. */
const primeraFilaDeLaLista = () => cy.get('tbody tr').first();

// HU-IO-01 · REGISTRAR ENTRADA

describe('HU-IO-01 · Registrar entrada', () => {
  before(prepararBase);
  after(dejarTodoFuera);

  //  API 
  describe('POST /input_output/entrada', () => {
    const entrada = (usuario, vehiculo, rol = 'celador') =>
      cy.apiCall(rol, 'POST', '/input_output/entrada', { body: { id_usuario_entra: usuario, id_vehiculo: vehiculo } });

    it('CP-IO-29: cupo activo y sin entrada abierta → 201 y queda DENTRO', () => {
      asegurarFuera('aprendiz1');
      cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        entrada(id, v).then((r) => {
          esperarOk(r, 201);
          expect(r.body.mensaje).to.eq('Entrada registrada correctamente.');
          expect(r.body.id_entrada_salida).to.be.a('number');
          cy.apiCall('celador', 'GET', `/input_output/${r.body.id_entrada_salida}`).then((d) => {
            expect(d.body.datos.fecha_hora_salida).to.eq(null);
            expect(d.body.datos.celador_ingreso).to.be.a('string');
          });
        });
      }));
    });
    it('CP-IO-30: repetir la entrada → 409', () => {
      asegurarDentro('aprendiz1');
      cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        entrada(id, v).then((r) => esperarError(r, 409, 'El vehículo ya tiene una entrada abierta.'));
      }));
    });
    it('CP-IO-31: cupo inactivo → 403', () => {
      fijarCupo('aprendiz2', 0);
      cy.sesionApi('aprendiz2').then(({ id }) => vehiculoDe('aprendiz2').then((v) => {
        entrada(id, v).then((r) => esperarError(r, 403, SIN_CUPO));
      }));
    });
    it('CP-IO-32: usuario sin cupo → 403', () => {
      cy.sesionApi('aprendiz3').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        entrada(id, v).then((r) => esperarError(r, 403, SIN_CUPO));
      }));
    });
    it('CP-IO-33: vehículo de otro usuario → 403', () => {
      cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('invitado1').then((v) => {
        entrada(id, v).then((r) => esperarError(r, 403, SIN_CUPO));
      }));
    });
    it('CP-IO-34: falta id_usuario_entra → 400', () => {
      vehiculoDe('aprendiz1').then((v) => cy.apiCall('celador', 'POST', '/input_output/entrada', { body: { id_vehiculo: v } })
        .then((r) => esperarError(r, 400, 'Falta el campo obligatorio: id_usuario_entra.')));
    });
    it('CP-IO-35: falta id_vehiculo → 400', () => {
      cy.sesionApi('aprendiz1').then(({ id }) => cy.apiCall('celador', 'POST', '/input_output/entrada', { body: { id_usuario_entra: id } })
        .then((r) => esperarError(r, 400, 'Falta el campo obligatorio: id_vehiculo.')));
    });
    [['', 'cadena vacía'], [null, 'null']].forEach(([valor, nombre]) => {
      ['id_usuario_entra', 'id_vehiculo'].forEach((campo) => it(`CP-IO-36: ${campo} con ${nombre} → 400`, () => {
        cy.apiCall('celador', 'POST', '/input_output/entrada', { body: { id_usuario_entra: 1, id_vehiculo: 1, [campo]: valor } })
          .then((r) => esperarError(r, 400, `Falta el campo obligatorio: ${campo}.`));
      }));
    });
    [0, -1, 1.5, 'abc'].forEach((v) => ['id_usuario_entra', 'id_vehiculo'].forEach((campo) => {
      it(`CP-IO-37: ${campo}=${v} → 400`, () => {
        cy.apiCall('celador', 'POST', '/input_output/entrada', { body: { id_usuario_entra: 1, id_vehiculo: 1, [campo]: v } })
          .then((r) => esperarError(r, 400, `${campo} debe ser un entero positivo.`));
      });
    }));
    it('CP-IO-38: ids numéricos como texto se aceptan', () => {
      asegurarFuera('aprendiz1');
      cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        entrada(String(id), String(v)).then((r) => esperarOk(r, 201));
      }));
    });
    it('CP-IO-39: cuerpo vacío → 400 y JSON malformado no devuelve 500', () => {
      cy.apiCall('celador', 'POST', '/input_output/entrada', { body: {} }).then((r) => esperarError(r, 400));
      cy.apiCall('celador', 'POST', '/input_output/entrada', {
        body: '{"id_usuario_entra": ', headers: { 'Content-Type': 'application/json' },
      }).then((r) => expect(r.status, 'JSON malformado (ver H-12)').to.be.within(400, 499));
    });
    it('CP-IO-40: dos entradas simultáneas → una 201 y una 409', () => {
      asegurarFuera('aprendiz1');
      cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        const body = { id_usuario_entra: id, id_vehiculo: v };
        cy.apiParalelo('celador', [
          { method: 'POST', path: '/input_output/entrada', body },
          { method: 'POST', path: '/input_output/entrada', body },
        ]).then((rs) => expect(rs.map((r) => r.status).sort()).to.deep.eq([201, 409]));
      }));
    });
    it('CP-IO-41: tras la salida se puede registrar una nueva entrada', () => {
      registroCerrado('aprendiz1');
      cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        entrada(id, v).then((r) => esperarOk(r, 201));
      }));
    });
    ['aprendiz1', 'invitado1', 'jefe', 'admin'].forEach((rol) => it(`CP-IO-42: ${rol} no puede registrar entradas → 403`, () => {
      entrada(1, 1, rol).then((r) => esperarError(r, 403));
    }));
  });

  // ---- Interfaz ----------------------------------------------------------
  describe('Interfaz · pantalla Registrar operación (entrada)', () => {
    before(() => { refrescarCupo('aprendiz1', 1); refrescarCupo('aprendiz2', 0); asegurarFuera('aprendiz1'); });
    beforeEach(() => { cy.uiLogin('celador'); cy.visit('/entradas-salidas/operar'); });

    it('CP-UI-IO-10: el buscador filtra y muestra "No hay coincidencias."', () => {
      cy.get('#cupo').type('zzz-no-existe');
      cy.contains('.list-group-item', 'No hay coincidencias.');
      cy.get('#cupo').clear().type(doc('aprendiz1'));
      cy.get('.list-group-item-action').should('have.length.at.least', 1);
    });
    it('CP-UI-IO-11: cupo activo muestra información y botones de operación', () => {
      seleccionarCupo('aprendiz1');
      cy.contains('h3', 'Información validada');
      cy.contains('button', 'Registrar entrada');
      cy.contains('button', 'Registrar salida');
    });
    it('CP-UI-IO-12: cupo inactivo no muestra botones', () => {
      seleccionarCupo('aprendiz2');
      cy.contains('h3', 'Información validada');
      cy.contains('button', 'Registrar entrada').should('not.exist');
      cy.contains('button', 'Registrar salida').should('not.exist');
    });
    it('CP-UI-IO-13: registrar entrada → mensaje y redirección a la lista', () => {
      asegurarFuera('aprendiz1');
      cy.reload();
      seleccionarCupo('aprendiz1');
      cy.contains('button', 'Registrar entrada').click();
      cy.contains('Entrada registrada correctamente.');
      cy.location('pathname').should('eq', '/entradas-salidas');
    });
    it('CP-UI-IO-14: entrada con vehículo ya dentro → mensaje de conflicto', () => {
      asegurarDentro('aprendiz1');
      cy.reload();
      seleccionarCupo('aprendiz1');
      cy.contains('button', 'Registrar entrada').click();
      cy.contains('El vehículo ya tiene una entrada abierta.');
    });

    it('CP-UI-IO-21: tras registrar la entrada, la lista muestra el registro DENTRO (sin fecha de salida)', () => {
      asegurarFuera('aprendiz1');
      cy.reload();
      seleccionarCupo('aprendiz1');
      cy.contains('button', 'Registrar entrada').click();
      cy.contains('Entrada registrada correctamente.');
      cy.location('pathname').should('eq', '/entradas-salidas');
      cy.apiCall('aprendiz1', 'GET', '/quota/me').then((m) => {
        primeraFilaDeLaLista().should('contain', m.body.vehiculo.identificador_vehiculo);
        primeraFilaDeLaLista().find('td').eq(6).should('have.text', '—');
      });
    });
  });

  describe('Interfaz · control de acceso a Registrar operación', () => {
    ['jefe', 'admin', 'aprendiz1', 'invitado1'].forEach((rol) => it(`CP-UI-IO-23: ${rol} no accede a /entradas-salidas/operar`, () => {
      cy.uiLogin(rol);
      cy.visit('/entradas-salidas/operar');
      cy.location('pathname').should('eq', '/unauthorized');
    }));
  });
});

// HU-IO-02 · REGISTRAR SALIDA

describe('HU-IO-02 · Registrar salida', () => {
  before(prepararBase);
  after(dejarTodoFuera);

  // ---- API ---------------------------------------------------------------
  describe('PATCH /input_output/salida/:id', () => {
    const salida = (id, rol = 'celador') => cy.apiCall(rol, 'PATCH', `/input_output/salida/${id}`, { body: {} });

    it('CP-IO-43: registro abierto → 200 y queda FUERA', () => {
      asegurarDentro('invitado1').then((id) => {
        salida(id).then((r) => {
          esperarOk(r);
          expect(r.body.mensaje).to.eq('Salida registrada correctamente.');
          cy.apiCall('celador', 'GET', `/input_output/${id}`).then((d) => {
            expect(d.body.datos.fecha_hora_salida).to.not.eq(null);
            expect(d.body.datos.celador_salida).to.be.a('string');
          });
        });
      });
    });
    it('CP-IO-44: repetir la salida → 409', () => {
      asegurarDentro('invitado1').then((id) => {
        salida(id);
        salida(id).then((r) => esperarError(r, 409, 'Este registro ya tiene una salida.'));
      });
    });
    it('CP-IO-45: registro ya cerrado → 409', () => {
      registroCerrado('aprendiz1').then((id) => salida(id).then((r) => esperarError(r, 409, 'Este registro ya tiene una salida.')));
    });
    it('CP-IO-46: id inexistente → 404', () => {
      salida(INEXISTENTE).then((r) => esperarError(r, 404, 'Registro de entrada no encontrado.'));
    });
    ['abc', '0', '-1', 'undefined'].forEach((v) => it(`CP-IO-47: id=${v} → 400`, () => {
      salida(v).then((r) => esperarError(r, 400, 'id debe ser un entero positivo.'));
    }));
    const hayCelador2 = !!(Cypress.expose('users') || {}).celador2?.documento;
    (hayCelador2 ? it : it.skip)('CP-IO-48: otro celador puede cerrar la entrada y queda como celador de salida', () => {
      asegurarFuera('invitado1');
      asegurarDentro('invitado1').then((id) => {
        cy.sesionApi('celador2').then(({ id: celadorSalidaId }) => {
          salida(id, 'celador2').then((r) => {
            esperarOk(r);
            cy.apiCall('jefe', 'GET', `/input_output/${id}`).then((d) => {
              expect(d.body.datos.id_usuario_celador_salida).to.eq(celadorSalidaId);
              expect(d.body.datos.id_usuario_celador_salida).to.not.eq(d.body.datos.id_usuario_celador_ingreso);
            });
          });
        });
      });
    });
    it('CP-IO-49: dos salidas simultáneas → una 200 y una 409', () => {
      asegurarDentro('invitado1').then((id) => {
        cy.apiParalelo('celador', [
          { method: 'PATCH', path: `/input_output/salida/${id}`, body: {} },
          { method: 'PATCH', path: `/input_output/salida/${id}`, body: {} },
        ]).then((rs) => expect(rs.map((r) => r.status).sort()).to.deep.eq([200, 409]));
      });
    });
    ['aprendiz1', 'invitado1', 'jefe', 'admin'].forEach((rol) => it(`CP-IO-50: ${rol} no puede registrar salidas → 403`, () => {
      salida(1, rol).then((r) => esperarError(r, 403));
    }));
  });

  describe('API · ciclo completo de un vehículo', () => {
    it('CP-IO-71: entrada → salida → nueva entrada, con /quota/me coherente en cada paso', () => {
      asegurarFuera('aprendiz1');
      cy.sesionApi('aprendiz1').then(({ id }) => vehiculoDe('aprendiz1').then((v) => {
        const body = { id_usuario_entra: id, id_vehiculo: v };
        cy.apiCall('celador', 'POST', '/input_output/entrada', { body }).then((e1) => {
          esperarOk(e1, 201);
          cy.apiCall('aprendiz1', 'GET', '/quota/me').then((m) => {
            expect(m.body.vehiculoEnParqueadero).to.eq(true);
            expect(m.body.idEntradaAbierta).to.eq(e1.body.id_entrada_salida);
          });
          cy.apiCall('celador', 'PATCH', `/input_output/salida/${e1.body.id_entrada_salida}`, { body: {} }).then((s) => esperarOk(s));
          cy.apiCall('aprendiz1', 'GET', '/quota/me').then((m) => {
            expect(m.body.vehiculoEnParqueadero).to.eq(false);
            expect(m.body.idEntradaAbierta).to.eq(null);
          });
          cy.apiCall('celador', 'POST', '/input_output/entrada', { body }).then((e2) => {
            esperarOk(e2, 201);
            expect(e2.body.id_entrada_salida).to.not.eq(e1.body.id_entrada_salida);
          });
        });
      }));
      asegurarFuera('aprendiz1');
    });
  });

  // Interfaz 
  describe('Interfaz · pantalla Registrar operación (salida)', () => {
    before(() => { refrescarCupo('aprendiz1', 1); refrescarCupo('aprendiz2', 0); asegurarFuera('aprendiz1'); });
    beforeEach(() => { cy.uiLogin('celador'); cy.visit('/entradas-salidas/operar'); });

    it('CP-UI-IO-15: registrar salida con vehículo dentro → mensaje y redirección', () => {
      asegurarDentro('aprendiz1');
      cy.reload();
      seleccionarCupo('aprendiz1');
      cy.contains('button', 'Registrar salida').click();
      cy.contains('Salida registrada correctamente.');
      cy.location('pathname').should('eq', '/entradas-salidas');
    });
    it('CP-UI-IO-16: salida con vehículo que no está dentro → mensaje de error (H-06)', () => {
      asegurarFuera('aprendiz1');
      cy.reload();
      seleccionarCupo('aprendiz1');
      cy.contains('button', 'Registrar salida').click();
      cy.get('p.mt-3').should('not.be.empty').and('not.contain', 'Salida registrada correctamente.');
      cy.location('pathname').should('eq', '/entradas-salidas/operar');
    });

    it('CP-UI-IO-24: tras registrar la salida, la lista muestra la fecha de salida del registro', () => {
      asegurarDentro('aprendiz1');
      cy.reload();
      seleccionarCupo('aprendiz1');
      cy.contains('button', 'Registrar salida').click();
      cy.contains('Salida registrada correctamente.');
      cy.location('pathname').should('eq', '/entradas-salidas');
      primeraFilaDeLaLista().find('td').eq(6).invoke('text').should('match', /\d{2}\/\d{2}\/\d{4}/);
    });
  });
});


// COMPLEMENTARIAS · consultar registros y registrar invitado
// (no pertenecen a las historias HU-IO-01 y HU-IO-02, pero son del mismo módulo)
describe('Complementarias de input_output · API', () => {
  before(prepararBase);
  after(dejarTodoFuera);

  describe('GET /input_output (listado general)', () => {
    it('CP-IO-01: CELADOR sin parámetros → 200, página 1, límite 20, orden descendente', () => {
      cy.apiCall('celador', 'GET', '/input_output').then((r) => {
        esperarOk(r);
        expect(r.body.pagina).to.eq(1);
        expect(r.body.limite).to.eq(20);
        expect(r.body.datos).to.be.an('array').and.have.length.of.at.most(20);
        const fechas = r.body.datos.map((d) => new Date(d.fecha_hora_ingreso).getTime());
        fechas.slice(1).forEach((f, i) => expect(f).to.be.at.most(fechas[i]));
        if (r.body.datos[0]) {
          ['id', 'registro_id', 'persona_ingresa', 'documento_persona', 'tipo_vehiculo', 'marca',
            'identificador_vehiculo', 'fecha_hora_ingreso'].forEach((k) => expect(r.body.datos[0]).to.have.property(k));
        }
      });
    });

    it('CP-IO-02: estado=DENTRO solo trae registros sin salida', () => {
      asegurarDentro('invitado1');
      cy.apiCall('celador', 'GET', '/input_output', { qs: { estado: 'DENTRO', limite: 100 } }).then((r) => {
        esperarOk(r);
        expect(r.body.datos).to.not.be.empty;
        r.body.datos.forEach((d) => expect(d.fecha_hora_salida).to.eq(null));
      });
    });

    it('CP-IO-03: estado=FUERA solo trae registros con salida', () => {
      registroCerrado('aprendiz1');
      cy.apiCall('celador', 'GET', '/input_output', { qs: { estado: 'FUERA', limite: 100 } }).then((r) => {
        esperarOk(r);
        expect(r.body.datos).to.not.be.empty;
        r.body.datos.forEach((d) => expect(d.fecha_hora_salida).to.not.eq(null));
      });
    });

    it('CP-IO-04: estado desconocido se ignora (documenta H-07)', () => {
      cy.apiCall('celador', 'GET', '/input_output').then((base) => {
        cy.apiCall('celador', 'GET', '/input_output', { qs: { estado: 'otro' } }).then((r) => {
          esperarOk(r);
          expect(r.body.total).to.eq(base.body.total);
        });
      });
    });

    it('CP-IO-05: filtra por id_usuario', () => {
      registroCerrado('aprendiz1');
      cy.sesionApi('aprendiz1').then(({ id }) => {
        cy.apiCall('celador', 'GET', '/input_output', { qs: { id_usuario: id, limite: 100 } }).then((r) => {
          esperarOk(r);
          expect(r.body.datos).to.not.be.empty;
          r.body.datos.forEach((d) => expect(d.id_usuario_entra).to.eq(id));
        });
      });
    });

    it('CP-IO-06: filtra por id_vehiculo', () => {
      asegurarDentro('invitado1');
      vehiculoDe('invitado1').then((v) => {
        cy.apiCall('celador', 'GET', '/input_output', { qs: { id_vehiculo: v, limite: 100 } }).then((r) => {
          esperarOk(r);
          expect(r.body.datos).to.not.be.empty;
          r.body.datos.forEach((d) => expect(d.id_vehiculo).to.eq(v));
        });
      });
    });

    it('CP-IO-07: combina id_usuario y estado=DENTRO', () => {
      asegurarDentro('invitado1').then((idEntrada) => {
        cy.sesionApi('invitado1').then(({ id }) => {
          cy.apiCall('celador', 'GET', '/input_output', { qs: { id_usuario: id, estado: 'DENTRO' } }).then((r) => {
            esperarOk(r);
            expect(r.body.datos.map((d) => d.id)).to.include(idEntrada);
            r.body.datos.forEach((d) => { expect(d.id_usuario_entra).to.eq(id); expect(d.fecha_hora_salida).to.eq(null); });
          });
        });
      });
    });

    IDS_INVALIDOS.forEach((v) => {
      it(`CP-IO-08: id_usuario=${v} → 400`, () => {
        cy.apiCall('celador', 'GET', '/input_output', { qs: { id_usuario: v } })
          .then((r) => esperarError(r, 400, 'id_usuario debe ser un entero positivo.'));
      });
    });

    it('CP-IO-09: limite=1 → un solo elemento y total real', () => {
      cy.apiCall('celador', 'GET', '/input_output', { qs: { limite: 1 } }).then((r) => {
        esperarOk(r);
        expect(r.body.datos).to.have.length.of.at.most(1);
        expect(r.body.total).to.be.at.least(r.body.datos.length);
      });
    });
    it('CP-IO-10: limite=100 → 200', () => {
      cy.apiCall('celador', 'GET', '/input_output', { qs: { limite: 100 } }).then((r) => { esperarOk(r); expect(r.body.limite).to.eq(100); });
    });
    it('CP-IO-11: limite=101 → 400', () => {
      cy.apiCall('celador', 'GET', '/input_output', { qs: { limite: 101 } }).then((r) => esperarError(r, 400, 'limite no puede superar 100.'));
    });
    [['limite', '0'], ['limite', '-1'], ['limite', 'abc'], ['pagina', '0'], ['pagina', '-1'], ['pagina', 'abc']].forEach(([campo, valor]) => {
      it(`CP-IO-12: ${campo}=${valor} → 400`, () => {
        cy.apiCall('celador', 'GET', '/input_output', { qs: { [campo]: valor } })
          .then((r) => esperarError(r, 400, `${campo} debe ser un entero positivo.`));
      });
    });
    it('CP-IO-13: página fuera de rango → datos vacíos y total correcto', () => {
      cy.apiCall('celador', 'GET', '/input_output', { qs: { pagina: 99999 } }).then((r) => {
        esperarOk(r);
        expect(r.body.datos).to.have.length(0);
        expect(r.body.total).to.be.a('number');
      });
    });
    it('CP-IO-14: JEFE puede listar → 200', () => {
      cy.apiCall('jefe', 'GET', '/input_output').then((r) => esperarOk(r));
    });
    it('CP-IO-14b: ADMIN no puede listar → 403', () => {
      cy.apiCall('admin', 'GET', '/input_output').then((r) => esperarError(r, 403));
    });
    ['aprendiz1', 'invitado1'].forEach((rol) => it(`CP-IO-15: ${rol} no puede listar → 403`, () => {
      cy.apiCall(rol, 'GET', '/input_output').then((r) => esperarError(r, 403));
    }));
  });

  describe('GET /input_output/me (mis registros)', () => {
    it('CP-IO-16: APRENDIZ ve solo sus registros', () => {
      registroCerrado('aprendiz1');
      cy.sesionApi('aprendiz1').then(({ id }) => {
        cy.apiCall('aprendiz1', 'GET', '/input_output/me', { qs: { limite: 100 } }).then((r) => {
          esperarOk(r);
          expect(r.body.datos).to.not.be.empty;
          r.body.datos.forEach((d) => expect(d.id_usuario_entra).to.eq(id));
        });
      });
    });
    it('CP-IO-17: se ignora id_usuario ajeno en la query', () => {
      asegurarDentro('invitado1');
      cy.sesionApi('invitado1').then((inv) => cy.sesionApi('aprendiz1').then((apr) => {
        cy.apiCall('invitado1', 'GET', '/input_output/me', { qs: { id_usuario: apr.id, limite: 100 } }).then((r) => {
          esperarOk(r);
          expect(r.body.datos).to.not.be.empty;
          r.body.datos.forEach((d) => expect(d.id_usuario_entra).to.eq(inv.id));
        });
      }));
    });
    it('CP-IO-18: usuario sin registros → datos vacíos', () => {
      crearAprendiz('ioSinRegistros').then(() => {
        cy.apiCall('ioSinRegistros', 'GET', '/input_output/me').then((r) => {
          esperarOk(r);
          expect(r.body.datos).to.have.length(0);
          expect(r.body.total).to.eq(0);
        });
      });
    });
    it('CP-IO-19: estado=DENTRO y paginación sobre registros propios', () => {
      asegurarDentro('invitado1').then((idEntrada) => {
        cy.apiCall('invitado1', 'GET', '/input_output/me', { qs: { estado: 'DENTRO', limite: 5, pagina: 1 } }).then((r) => {
          esperarOk(r);
          expect(r.body.datos.map((d) => d.id)).to.include(idEntrada);
          r.body.datos.forEach((d) => expect(d.fecha_hora_salida).to.eq(null));
        });
      });
    });
    ['celador', 'jefe', 'admin'].forEach((rol) => it(`CP-IO-20: ${rol} no puede usar /me → 403`, () => {
      cy.apiCall(rol, 'GET', '/input_output/me').then((r) => esperarError(r, 403));
    }));
  });

  describe('GET /input_output/:id (detalle)', () => {
    it('CP-IO-21: CELADOR y JEFE ven el detalle completo', () => {
      asegurarDentro('aprendiz1').then((id) => {
        ['celador', 'jefe'].forEach((rol) => {
          cy.apiCall(rol, 'GET', `/input_output/${id}`).then((r) => {
            esperarOk(r);
            expect(r.body.datos.id).to.eq(id);
            ['persona_ingresa', 'documento_persona', 'correo', 'tipo_vehiculo', 'marca', 'color',
              'fecha_hora_ingreso', 'celador_ingreso'].forEach((k) => expect(r.body.datos).to.have.property(k));
          });
        });
      });
    });
    it('CP-IO-22: APRENDIZ consulta su propio registro → 200', () => {
      asegurarDentro('aprendiz1').then((id) => {
        cy.apiCall('aprendiz1', 'GET', `/input_output/${id}`).then((r) => esperarOk(r));
      });
    });
    it('CP-IO-23: APRENDIZ/INVITADO no pueden ver registros ajenos → 403', () => {
      asegurarDentro('aprendiz1').then((id) => {
        cy.apiCall('invitado1', 'GET', `/input_output/${id}`).then((r) => esperarError(r, 403, 'No puede consultar este registro.'));
      });
      asegurarDentro('invitado1').then((id) => {
        cy.apiCall('aprendiz1', 'GET', `/input_output/${id}`).then((r) => esperarError(r, 403, 'No puede consultar este registro.'));
      });
    });
    it('CP-IO-24: id inexistente → 404', () => {
      cy.apiCall('celador', 'GET', `/input_output/${INEXISTENTE}`)
        .then((r) => esperarError(r, 404, 'Registro de entrada/salida no encontrado.'));
    });
    IDS_INVALIDOS.forEach((v) => it(`CP-IO-25: id=${v} → 400`, () => {
      cy.apiCall('celador', 'GET', `/input_output/${v}`).then((r) => esperarError(r, 400, 'id debe ser un entero positivo.'));
    }));
    it('CP-IO-26: registro de aprendiz incluye ficha', () => {
      asegurarDentro('aprendiz1').then((id) => {
        cy.apiCall('celador', 'GET', `/input_output/${id}`).then((r) => expect(r.body.datos.ficha).to.not.be.oneOf([null, undefined]));
      });
    });
    it('CP-IO-27: registro de invitado no incluye ficha ni centro', () => {
      asegurarDentro('invitado1').then((id) => {
        cy.apiCall('celador', 'GET', `/input_output/${id}`).then((r) => {
          expect(r.body.datos.ficha).to.eq(null);
          expect(r.body.datos.nombre_centro).to.eq(null);
        });
      });
    });
    it('CP-IO-28: ADMIN no puede consultar el detalle → 403 (H-03)', () => {
      asegurarDentro('aprendiz1').then((id) => {
        cy.apiCall('admin', 'GET', `/input_output/${id}`).then((r) => esperarError(r, 403));
      });
    });
  });

  describe('POST /input_output/invitado', () => {
    const enviar = (campos, archivos = [], rol = 'celador') => cy.apiMultipart(rol, '/input_output/invitado', campos, archivos);

    it('CP-IO-51: invitado nuevo sin imágenes → 201, credenciales, cupo activo y entrada abierta', () => {
      const datos = invitadoBase();
      enviar(datos).then((r) => {
        esperarOk(r, 201);
        expect(r.body.mensaje).to.eq('Invitado registrado y entrada creada.');
        expect(r.body.id_usuario).to.be.a('number');
        expect(r.body.id_vehiculo).to.be.a('number');
        expect(r.body.credenciales_temporales).to.include({ correo: datos.correo });
        expect(r.body.credenciales_temporales.password).to.be.a('string').and.not.be.empty;
        cy.apiCall('celador', 'GET', `/quota/usuario/${r.body.id_usuario}`).then((q) => {
          expect(q.body.vehiculo.id_vehiculo).to.eq(r.body.id_vehiculo);
          expect(q.body.vehiculo.estado_cupo).to.eq(1);
          expect(q.body.vehiculoEnParqueadero).to.eq(true);
        });
        cy.apiCall(null, 'POST', '/auth/storeAuthLogin', {
          body: { numero_documento: datos.numero_documento, password: r.body.credenciales_temporales.password },
        }).then((l) => { expect(l.status).to.eq(200); expect(l.body.usuario.roles).to.include('INVITADO'); });
      });
    });
    it('CP-IO-52: con las 3 imágenes válidas → 201 y archivos accesibles', () => {
      enviar(invitadoBase(), [imagen(TRES_IMAGENES[0], 'png'), imagen(TRES_IMAGENES[1], 'jpg'), imagen(TRES_IMAGENES[2], 'webp')]).then((r) => {
        esperarOk(r, 201);
        cy.apiCall('celador', 'GET', `/quota/usuario/${r.body.id_usuario}`).then((q) => {
          cy.apiCall('celador', 'GET', `/input_output/${q.body.idEntradaAbierta}`).then((d) => {
            expect(d.body.datos.imagen_url_vehiculo).to.not.eq(GENERICA);
            const raiz = Cypress.expose('apiUrl').replace(/\/api\/?$/, '');
            cy.request({ url: `${raiz}/storage/${d.body.datos.imagen_url_vehiculo}`, failOnStatusCode: false })
              .its('status').should('eq', 200);
          });
        });
      });
    });
    it('CP-IO-53: usuario existente y activo → 409 sin crear otro registro', () => {
      crearInvitado().then((u) => {
        enviar({ ...invitadoBase(), id_usuario: u.id_usuario, numero_documento: undefined, correo: undefined }).then((r) => {
          esperarError(r, 409, 'El usuario ya está registrado;');
        });
      });
    });
    it('CP-IO-54: usuario inexistente → 404 y no se crea nada', () => {
      enviar({ ...invitadoBase(), id_usuario: INEXISTENTE }).then((r) => esperarError(r, 404, 'Usuario no encontrado.'));
    });
    const inactivo = Cypress.expose('seed')?.usuarioInactivoId;
    (inactivo ? it : it.skip)('CP-IO-54b: usuario inactivo ya existente → 409 (requiere seed.usuarioInactivoId)', () => {
      enviar({ ...invitadoBase(), id_usuario: inactivo }).then((r) => esperarError(r, 409, 'El usuario ya está registrado;'));
    });
    ['tipo_vehiculo', 'marca', 'color', 'placa', 'cilindraje', 'modelo'].forEach((campo) => it(`CP-IO-55: falta ${campo} → 400`, () => {
      enviar(invitadoBase({ [campo]: undefined })).then((r) => esperarError(r, 400, `Falta el campo obligatorio: ${campo}.`));
    }));
    it('CP-IO-55b: no requiere expira_en; el servidor define la vigencia → 201', () => {
      enviar(invitadoBase({ expira_en: undefined })).then((r) => esperarOk(r, 201));
    });
    ['tipo_documento', 'numero_documento', 'primer_nombre', 'primer_apellido', 'n_celular', 'correo'].forEach((campo) => {
      it(`CP-IO-56: invitado nuevo sin ${campo} → 400`, () => {
        enviar(invitadoBase({ [campo]: undefined })).then((r) => esperarError(r, 400, `Falta el campo obligatorio: ${campo}.`));
      });
    });
    it('CP-IO-57: tipo_vehiculo en minúsculas se normaliza → 201', () => {
      enviar(invitadoBase({ tipo_vehiculo: 'moto' })).then((r) => esperarOk(r, 201));
    });
    it('CP-IO-58: tipo_vehiculo inválido → 400', () => {
      enviar(invitadoBase({ tipo_vehiculo: 'CARRO' })).then((r) => esperarError(r, 400, 'tipo_vehiculo debe ser MOTO o BICICLETA.'));
    });
    it('CP-IO-59/60/61: la fecha de expiración enviada por el cliente se ignora', () => {
      enviar(invitadoBase({ expira_en: pasado() })).then((r) => esperarOk(r, 201));
    });
    it('CP-IO-62: documento o correo duplicado → 409', () => {
      const a = invitadoBase();
      enviar(a).then((r) => esperarOk(r, 201));
      enviar(invitadoBase({ numero_documento: a.numero_documento })).then((r) => esperarError(r, 409, 'El registro ya existe.'));
      enviar(invitadoBase({ correo: a.correo })).then((r) => esperarError(r, 409, 'El registro ya existe.'));
    });
    it('CP-IO-63: imagen mayor a 5 MB → 400 y no se crea el usuario', () => {
      const datos = invitadoBase();
      enviar(datos, [imagenGrande(TRES_IMAGENES[0])]).then((r) => {
        expect(r.status).to.eq(400);
        expect(r.body.ok).to.eq(false);
      });
      cy.apiCall(null, 'POST', '/auth/storeAuthLogin', { body: { numero_documento: datos.numero_documento, password: 'x' } })
        .then((l) => expect(l.status).to.eq(401));
    });
    it('CP-IO-64: PDF o imagen con MIME/extensión distintos → 400', () => {
      enviar(invitadoBase(), [archivoPdf(TRES_IMAGENES[0])])
        .then((r) => esperarError(r, 400, 'Solo se permiten imágenes JPG, PNG o WEBP.'));
      enviar(invitadoBase(), [imagenMimeFalso(TRES_IMAGENES[1])])
        .then((r) => esperarError(r, 400, 'Solo se permiten imágenes JPG, PNG o WEBP.'));
    });
    it('CP-IO-65: archivo en un campo no esperado → 400', () => {
      enviar(invitadoBase(), [{ ...imagen('campo_no_permitido', 'png') }]).then((r) => expect(r.status).to.eq(400));
    });
    it('CP-IO-66: dos archivos en el mismo campo → 400', () => {
      enviar(invitadoBase(), [imagen(TRES_IMAGENES[0], 'png'), imagen(TRES_IMAGENES[0], 'jpg')]).then((r) => expect(r.status).to.eq(400));
    });
    it('CP-IO-67: JSON sin campos en lugar de multipart → 400 sin 500', () => {
      cy.apiCall('celador', 'POST', '/input_output/invitado', { body: {} }).then((r) => esperarError(r, 400, 'Falta el campo obligatorio'));
    });
    it('CP-IO-68: correo con formato inválido → 400 (H-08)', () => {
      enviar(invitadoBase({ correo: 'a@' })).then((r) => expect(r.status, 'correo inválido aceptado (H-08)').to.eq(400));
    });
    it('CP-IO-69: si falla (duplicado) no se crea ningún cupo nuevo', () => {
      const a = invitadoBase();
      enviar(a).then((r) => esperarOk(r, 201));
      cy.apiCall('admin', 'GET', '/quota', { qs: { limite: 1 } }).then((antes) => {
        enviar(invitadoBase({ numero_documento: a.numero_documento }), [imagen(TRES_IMAGENES[0], 'png')]).then((r) => esperarError(r, 409));
        cy.apiCall('admin', 'GET', '/quota', { qs: { limite: 1 } }).then((despues) => expect(despues.body.total).to.eq(antes.body.total));
      });
    });
    ['admin', 'jefe', 'aprendiz1', 'invitado1'].forEach((rol) => it(`CP-IO-70: ${rol} no puede registrar invitados → 403`, () => {
      enviar(invitadoBase(), [], rol).then((r) => esperarError(r, 403));
    }));
  });
});

describe('Complementarias de input_output · Interfaz', () => {
  before(() => { refrescarCupo('aprendiz1', 1); refrescarCupo('aprendiz2', 0); asegurarFuera('aprendiz1'); });
  after(dejarTodoFuera);

  describe('Listado /entradas-salidas', () => {
    it('CP-UI-IO-01: CELADOR ve 10 columnas y los botones de registro', () => {
      cy.uiLogin('celador');
      cy.visit('/entradas-salidas');
      cy.contains('h2', 'Entradas y Salidas');
      cy.get('thead th').should('have.length', 10);
      ['Tipo de vehículo', 'Marca', 'Placa / Marco', 'Persona que ingresa', 'Documento', 'Fecha ingreso',
        'Fecha salida', 'Celador de ingreso', 'Celador de salida', 'Acciones'].forEach((t) => cy.contains('th', t));
      cy.contains('button', 'Registrar operación');
      cy.contains('button', 'Registrar invitado');
    });
    it('CP-UI-IO-02: APRENDIZ usa /input_output/me y no ve botones de registro', () => {
      cy.intercept('GET', '**/input_output/me*').as('mis');
      cy.uiLogin('aprendiz1');
      cy.visit('/entradas-salidas');
      cy.wait('@mis').its('response.statusCode').should('eq', 200);
      cy.contains('button', 'Registrar operación').should('not.exist');
      cy.contains('button', 'Registrar invitado').should('not.exist');
    });
    it('CP-UI-IO-02b: INVITADO usa /input_output/me', () => {
      cy.intercept('GET', '**/input_output/me*').as('mis');
      cy.uiLogin('invitado1');
      cy.visit('/entradas-salidas');
      cy.wait('@mis').its('response.statusCode').should('eq', 200);
    });
    it('CP-UI-IO-03: JEFE ve todos los registros sin botones de registro', () => {
      cy.intercept('GET', /\/input_output$/).as('todos');
      cy.uiLogin('jefe');
      cy.visit('/entradas-salidas');
      cy.wait('@todos').its('response.statusCode').should('eq', 200);
      cy.contains('button', 'Registrar operación').should('not.exist');
    });
    it('CP-UI-IO-04: ADMIN es redirigido a /unauthorized (H-03)', () => {
      cy.uiLogin('admin');
      cy.visit('/entradas-salidas');
      cy.location('pathname').should('eq', '/unauthorized');
    });
    it('CP-UI-IO-05: formato de fechas y guion para salida vacía', () => {
      asegurarDentro('aprendiz1');
      cy.uiLogin('aprendiz1');
      cy.visit('/entradas-salidas');
      cy.get('tbody tr').first().within(() => {
        cy.contains('td', /\d{2}\/\d{2}\/\d{4}/);
        cy.contains('td', '—');
      });
    });
    it('CP-UI-IO-06: error del servidor se muestra bajo la tabla', () => {
      cy.intercept('GET', /\/input_output$/, { statusCode: 500, body: { ok: false, mensaje: 'Fallo simulado' } });
      cy.uiLogin('celador');
      cy.visit('/entradas-salidas');
      cy.get('.text-danger').should('contain', 'Fallo simulado');
    });
  });

  describe('Detalle /entradas-salidas/:id', () => {
    it('CP-UI-IO-07: muestra DENTRO y luego FUERA con los bloques de datos', () => {
      asegurarDentro('invitado1').then((id) => {
        cy.uiLogin('celador');
        cy.visit(`/entradas-salidas/${id}`);
        cy.contains('h2', 'Detalle de entrada/salida');
        cy.contains('dt', 'Estado').parent().should('contain', 'DENTRO');
        cy.contains('h3', 'Usuario');
        cy.contains('h3', 'Vehículo');
        cy.apiCall('celador', 'PATCH', `/input_output/salida/${id}`, { body: {} });
        cy.reload();
        cy.contains('dt', 'Estado').parent().should('contain', 'FUERA');
      });
    });
    it('CP-UI-IO-08: APRENDIZ no puede ver el registro de otro usuario', () => {
      fijarCupo('invitado1', 1);
      asegurarDentro('invitado1').then((id) => {
        cy.uiLogin('aprendiz1');
        cy.visit(`/entradas-salidas/${id}`);
        cy.get('.alert-danger').should('contain', 'No puede consultar este registro.');
      });
      asegurarFuera('invitado1');
    });
    it('CP-UI-IO-09: registro inexistente muestra error', () => {
      cy.uiLogin('celador');
      cy.visit(`/entradas-salidas/${INEXISTENTE}`);
      cy.get('.alert-danger').should('contain', 'Registro de entrada/salida no encontrado.');
    });
  });

  describe('Registro de invitado /entradas-salidas/invitado/nuevo', () => {
    const URL = '/entradas-salidas/invitado/nuevo';
    const llenar = (d) => {
      cy.get('select[name="tipo_documento"]').select(d.tipo_documento);
      ['numero_documento', 'primer_nombre', 'primer_apellido', 'n_celular', 'correo', 'marca', 'color', 'placa', 'cilindraje', 'modelo'].forEach((c) => {
        cy.get(`#${c}`).clear();
        cy.get(`#${c}`).type(String(d[c]));
      });
      cy.get('select[name="tipo_vehiculo"]').select(d.tipo_vehiculo);
    };
    beforeEach(() => { cy.uiLogin('celador'); cy.visit(URL); });

    it('CP-UI-IO-17: campos obligatorios vacíos bloquean el envío', () => {
      cy.intercept('POST', '**/input_output/invitado').as('crear');
      cy.contains('button', 'Registrar invitado e ingreso').click();
      cy.get('input:invalid').should('have.length.greaterThan', 0);
      cy.get('@crear.all').should('have.length', 0);
    });
    it('CP-UI-IO-18: registro exitoso muestra credenciales y no redirige', () => {
      cy.intercept('POST', '**/input_output/invitado').as('crear');
      llenar(invitadoBase());
      cy.contains('button', 'Registrar invitado e ingreso').click();
      cy.wait('@crear').its('response.statusCode').should('eq', 201);
      cy.get('.alert-info').should('contain', 'Contraseña temporal').and('contain', 'Correo:');
      cy.location('pathname').should('eq', URL);
    });
    it('CP-UI-IO-19: documento duplicado muestra el error', () => {
      const existente = invitadoBase();
      cy.apiMultipart('celador', '/input_output/invitado', existente).then(() => {
        llenar({ ...invitadoBase(), numero_documento: existente.numero_documento });
        cy.contains('button', 'Registrar invitado e ingreso').click();
        cy.get('.alert-info').should('contain', 'El registro ya existe.');
      });
    });
    it('CP-UI-IO-20: selectores y tipos de campo', () => {
      cy.get('select[name="tipo_documento"] option').then(($o) => expect([...$o].map((o) => o.textContent)).to.deep.eq(['CC', 'CE', 'PPT']));
      cy.get('select[name="tipo_vehiculo"] option').then(($o) => expect([...$o].map((o) => o.textContent)).to.deep.eq(['MOTO', 'BICICLETA']));
      cy.get('#expira_en').should('not.exist');
      cy.contains('La cuenta del invitado vence automáticamente a los seis meses.');
      cy.get('#correo').should('have.attr', 'type', 'email');
    });
  });
});