// Pruebas de caja negra del módulo core: salud del servicio y gestión de centros.
/* global describe, it, beforeEach, afterEach, cy, expect, Cypress */
import { esperarError, esperarOk, unico } from '../support/helpers';

const SIN_PERMISO = 'No tiene permisos para esta operación.';
const ID_INEXISTENTE = 999999999;

describe('core · API', () => {
  describe('GET /core/health', () => {
    it('CP-CORE-01: el estado del servicio es público y responde operational', () => {
      cy.apiCall(null, 'GET', '/core/health').then((r) => {
        esperarOk(r);
        expect(r.body.estado).to.eq('operational');
      });
      cy.apiCall(null, 'GET', '/core/health', { baseUrl: `${Cypress.expose('apiUrl').replace(/\/api$/, '')}/api/web/v1` }).then((r) => {
        esperarOk(r);
        expect(r.body.estado).to.eq('operational');
      });
    });
  });

  describe('Consulta de centros', () => {
    it('CP-CORE-02: el listado público no requiere sesión y devuelve centros ordenados', () => {
      cy.apiCall(null, 'GET', '/core/centros-publicos').then((r) => {
        esperarOk(r);
        expect(r.body.datos).to.be.an('array');
        const nombres = r.body.datos.map(({ nombre_centro }) => nombre_centro);
        expect(nombres).to.deep.eq([...nombres].sort((a, b) => a.localeCompare(b)));
        r.body.datos.forEach((centro) => expect(centro).to.include.keys('id', 'nombre_centro'));
      });
    });

    it('CP-CORE-03: la consulta administrativa exige token ADMINISTRADOR', () => {
      cy.apiCall(null, 'GET', '/core/centros').then((r) => esperarError(r, 401));
      ['jefe', 'celador', 'aprendiz', 'invitado1'].forEach((rol) => {
        cy.apiCall(rol, 'GET', '/core/centros').then((r) => esperarError(r, 403, SIN_PERMISO));
      });
    });

    it('CP-CORE-04: ADMINISTRADOR lista los centros con su estado', () => {
      cy.apiCall('admin', 'GET', '/core/centros').then((r) => {
        esperarOk(r);
        expect(r.body.datos).to.be.an('array');
        const nombres = r.body.datos.map(({ nombre_centro }) => nombre_centro);
        expect(nombres).to.deep.eq([...nombres].sort((a, b) => a.localeCompare(b)));
        r.body.datos.forEach((centro) => expect(centro).to.include.keys('id', 'nombre_centro', 'estado'));
      });
    });
  });

  describe('Administración de centros', () => {
    let centroCreadoId;

    beforeEach(() => {
      centroCreadoId = undefined;
    });

    afterEach(() => {
      if (centroCreadoId) {
        cy.apiCall('admin', 'PATCH', `/core/centros/${centroCreadoId}/estado`, { body: { estado: 0 } })
          .then((r) => esperarOk(r));
      }
    });

    it('CP-CORE-05: ADMINISTRADOR crea, edita, desactiva y reactiva un centro', () => {
      const nombre = `Centro Cypress ${unico()}`;
      const nombreEditado = `${nombre} editado`;
      let idCentro;

      cy.apiCall('admin', 'POST', '/core/centros', { body: { nombre_centro: `  ${nombre}  ` } }).then((creacion) => {
        esperarOk(creacion, 201);
        expect(creacion.body.mensaje).to.eq('Centro registrado.');
        expect(creacion.body.datos.nombre_centro).to.eq(nombre);
        idCentro = creacion.body.datos.id;
        centroCreadoId = idCentro;

        return cy.apiCall('admin', 'GET', '/core/centros').then((lista) => {
          esperarOk(lista);
          const centro = lista.body.datos.find((item) => item.id === idCentro);
          expect(centro).to.include({ nombre_centro: nombre, estado: 1 });
        });
      }).then(() => cy.apiCall('admin', 'PATCH', `/core/centros/${idCentro}`, { body: { nombre_centro: nombreEditado } }))
        .then((edicion) => {
          esperarOk(edicion);
          expect(edicion.body.mensaje).to.eq('Centro actualizado.');
          expect(edicion.body.datos).to.include({ id: idCentro, nombre_centro: nombreEditado });
        })
        .then(() => cy.apiCall('admin', 'PATCH', `/core/centros/${idCentro}/estado`, { body: { estado: 0 } }))
        .then((desactivacion) => {
          esperarOk(desactivacion);
          expect(desactivacion.body.mensaje).to.eq('Centro desactivado.');
          return cy.apiCall(null, 'GET', '/core/centros-publicos');
        })
        .then((publicos) => {
          esperarOk(publicos);
          expect(publicos.body.datos.some((centro) => centro.id === idCentro)).to.eq(false);
        })
        .then(() => cy.apiCall('admin', 'PATCH', `/core/centros/${idCentro}/estado`, { body: { estado: 1 } }))
        .then((activacion) => {
          esperarOk(activacion);
          expect(activacion.body.mensaje).to.eq('Centro activado.');
          return cy.apiCall(null, 'GET', '/core/centros-publicos');
        })
        .then((publicos) => {
          esperarOk(publicos);
          expect(publicos.body.datos.some((centro) => centro.id === idCentro)).to.eq(true);
        });
    });

    it('CP-CORE-06: rechaza datos inválidos y centros inexistentes', () => {
      cy.apiCall('admin', 'POST', '/core/centros', { body: { nombre_centro: '   ' } })
        .then((r) => esperarError(r, 400, 'nombre_centro'));
      cy.apiCall('admin', 'PATCH', '/core/centros/abc', { body: { nombre_centro: 'Centro' } })
        .then((r) => esperarError(r, 400, 'id debe ser un entero positivo.'));
      cy.apiCall('admin', 'PATCH', `/core/centros/${ID_INEXISTENTE}`, { body: { nombre_centro: 'Centro' } })
        .then((r) => esperarError(r, 404, 'Centro no encontrado.'));
      cy.apiCall('admin', 'PATCH', `/core/centros/${ID_INEXISTENTE}/estado`, { body: { estado: 0 } })
        .then((r) => esperarError(r, 404, 'Centro no encontrado.'));
      cy.apiCall('admin', 'PATCH', '/core/centros/1/estado', { body: { estado: 2 } })
        .then((r) => esperarError(r, 400, 'estado debe ser 0 o 1.'));
    });

    it('CP-CORE-07: solo ADMINISTRADOR puede crear, editar y cambiar el estado', () => {
      cy.apiCall(null, 'POST', '/core/centros', { body: { nombre_centro: `No autorizado ${unico()}` } })
        .then((r) => esperarError(r, 401));
      cy.apiCall(null, 'PATCH', '/core/centros/1', { body: { nombre_centro: 'No autorizado' } })
        .then((r) => esperarError(r, 401));
      cy.apiCall(null, 'PATCH', '/core/centros/1/estado', { body: { estado: 0 } })
        .then((r) => esperarError(r, 401));
      ['jefe', 'celador', 'aprendiz', 'invitado1'].forEach((rol) => {
        cy.apiCall(rol, 'POST', '/core/centros', { body: { nombre_centro: `No autorizado ${unico()}` } })
          .then((r) => esperarError(r, 403, SIN_PERMISO));
        cy.apiCall(rol, 'PATCH', '/core/centros/1', { body: { nombre_centro: 'No autorizado' } })
          .then((r) => esperarError(r, 403, SIN_PERMISO));
        cy.apiCall(rol, 'PATCH', '/core/centros/1/estado', { body: { estado: 0 } })
          .then((r) => esperarError(r, 403, SIN_PERMISO));
      });
    });
  });
});
