// Pruebas de caja negra del módulo user: listados, perfil, estado de cuenta, altas de personal y detalle académico.
// API (CP-US) e interfaz (CP-UI-US). Los usuarios que se modifican son desechables, creados por la API.
import {
  INEXISTENTE, IMAGENES_MOTO, esperarError, esperarOk, crearAprendiz, crearInvitadoComo, crearVehiculoApi, motoBase,
  fijarCupo, unico, imagen, archivoPdf,
} from '../support/helpers';
import { documentoDe, credenciales } from '../support/usuarios';

const SIN_PERMISO = 'No tiene permisos para esta operación.';
const SOLO_INVITADOS = 'El celador solo puede consultar invitados.';
const IDS_INVALIDOS = ['abc', '0', '-1', '1.5'];
const buscar = (texto) => cy.get('input[placeholder="Buscar..."]').clear().type(texto);
const idDe = (rol) => cy.sesionApi(rol).then((s) => s.id);
const datosPersonal = (cambios = {}) => {
  const n = unico();
  return {
    tipo_documento: 'CC', numero_documento: n, primer_nombre: 'Personal', primer_apellido: 'Prueba',
    n_celular: `3${n.slice(-9)}`, correo: `personal.${n}@prueba.test`, ...cambios,
  };
};

// ======================================================================
// user · API (CP-US)
// ======================================================================
describe('user · API', () => {
  before(() => {
    return crearAprendiz('aprendizU')
      .then(() => crearAprendiz('aprendizV'))
      .then(() => crearInvitadoComo('invitadoU'));
  });

  describe('GET /users (listado)', () => {
    ['admin', 'jefe'].forEach((rol) => it(`CP-US-01: ${rol} lista usuarios → 200 (página 1, límite 20)`, () => {
      cy.apiCall(rol, 'GET', '/users').then((r) => {
        esperarOk(r);
        expect(r.body.pagina).to.eq(1);
        expect(r.body.limite).to.eq(20);
        expect(r.body.datos).to.be.an('array').and.have.length.of.at.most(20);
        expect(r.body.datos[0]).to.include.keys('id', 'numero_documento', 'nombre', 'roles', 'estado');
        expect(r.body.datos[0]).to.not.have.any.keys('password', 'password_hash');
        const ids = r.body.datos.map((d) => d.id);
        expect(ids).to.deep.eq([...ids].sort((a, b) => b - a));
      });
    }));
    it('CP-US-02: filtra por rol', () => {
      cy.apiCall('admin', 'GET', '/users', { qs: { rol: 'APRENDIZ', limite: 100 } }).then((r) => {
        esperarOk(r);
        expect(r.body.datos).to.not.be.empty;
        r.body.datos.forEach((u) => expect(u.roles).to.include('APRENDIZ'));
      });
    });
    it('CP-US-03: busca por número de documento', () => {
      cy.apiCall('admin', 'GET', '/users', { qs: { q: documentoDe('aprendizU') } }).then((r) => {
        expect(r.body.total).to.eq(1);
        expect(r.body.datos[0].numero_documento).to.eq(documentoDe('aprendizU'));
      });
    });
    it('CP-US-04: busca por nombre', () => {
      cy.apiCall('admin', 'GET', '/users', { qs: { q: 'Aprendiz Prueba', limite: 100 } }).then((r) => {
        esperarOk(r);
        expect(r.body.datos.map((u) => u.numero_documento)).to.include(documentoDe('aprendizU'));
      });
    });
    it('CP-US-05: un rol inexistente devuelve lista vacía', () => {
      cy.apiCall('admin', 'GET', '/users', { qs: { rol: 'NO_EXISTE' } }).then((r) => { esperarOk(r); expect(r.body.total).to.eq(0); expect(r.body.datos).to.have.length(0); });
    });
    it('CP-US-06: paginación inválida → 400', () => {
      cy.apiCall('admin', 'GET', '/users', { qs: { limite: 101 } }).then((r) => esperarError(r, 400, 'limite no puede superar 100.'));
      cy.apiCall('admin', 'GET', '/users', { qs: { pagina: 0 } }).then((r) => esperarError(r, 400, 'pagina debe ser un entero positivo.'));
    });
    it('CP-US-07: el CELADOR solo puede listar invitados', () => {
      cy.apiCall('celador', 'GET', '/users').then((r) => esperarError(r, 403, SOLO_INVITADOS));
      cy.apiCall('celador', 'GET', '/users', { qs: { rol: 'APRENDIZ' } }).then((r) => esperarError(r, 403, SOLO_INVITADOS));
      cy.apiCall('celador', 'GET', '/users', { qs: { rol: 'INVITADO', limite: 100 } }).then((r) => {
        esperarOk(r);
        r.body.datos.forEach((u) => expect(u.roles).to.include('INVITADO'));
      });
    });
    ['aprendizU', 'invitadoU'].forEach((rol) => it(`CP-US-08: ${rol} no puede listar usuarios → 403`, () => {
      cy.apiCall(rol, 'GET', '/users').then((r) => esperarError(r, 403, SIN_PERMISO));
    }));
  });

  describe('GET /users/elegibles', () => {
    it('CP-US-10: ADMIN busca candidatos a jefe: nunca aparecen los que ya lo son', () => {
      cy.apiCall('admin', 'GET', '/users/elegibles', { qs: { q: documentoDe('aprendizU') } }).then((r) => {
        esperarOk(r);
        expect(r.body.datos.map((u) => u.numero_documento)).to.include(documentoDe('aprendizU'));
        expect(r.body.datos[0]).to.include.keys('id', 'nombre', 'correo', 'roles');
      });
      cy.apiCall('admin', 'GET', '/users/elegibles', { qs: { q: '' } }).then((r) => {
        expect(r.body.datos).to.have.length.of.at.most(25);
        r.body.datos.forEach((u) => expect(u.roles).to.not.include('JEFE_SEGURIDAD'));
      });
    });
    it('CP-US-11: JEFE busca candidatos a celador y el parámetro rol cambia el rol de destino', () => {
      cy.apiCall('jefe', 'GET', '/users/elegibles').then((r) => r.body.datos.forEach((u) => expect(u.roles).to.not.include('CELADOR')));
      cy.apiCall('jefe', 'GET', '/users/elegibles', { qs: { rol: 'JEFE_SEGURIDAD' } }).then((r) => r.body.datos.forEach((u) => expect(u.roles).to.not.include('JEFE_SEGURIDAD')));
    });
    ['celador', 'aprendizU', 'invitadoU'].forEach((rol) => it(`CP-US-12: ${rol} no puede buscar candidatos → 403`, () => {
      cy.apiCall(rol, 'GET', '/users/elegibles').then((r) => esperarError(r, 403, SIN_PERMISO));
    }));
    it('CP-US-13: los usuarios deshabilitados no son elegibles', () => {
      crearAprendiz('aprendizOculto').then((a) => {
        cy.apiCall('admin', 'PATCH', `/users/${a.id_usuario}/estado`, { body: { estado: 0 } }).then((r) => esperarOk(r));
        cy.apiCall('admin', 'GET', '/users/elegibles', { qs: { q: a.documento } }).then((r) => expect(r.body.datos).to.have.length(0));
      });
    });
  });

  describe('GET /users/:id (detalle)', () => {
    it('CP-US-14: ADMIN y JEFE ven roles y detalle académico, sin datos de contraseña', () => {
      ['admin', 'jefe'].forEach((rol) => idDe('aprendizU').then((id) => cy.apiCall(rol, 'GET', `/users/${id}`).then((r) => {
        esperarOk(r);
        expect(r.body.datos.roles).to.deep.eq(['APRENDIZ']);
        expect(r.body.datos.detalle_aprendiz).to.include.keys('ficha', 'nombre_centro');
        expect(r.body.datos).to.not.have.any.keys('password', 'password_hash');
      })));
      idDe('invitadoU').then((id) => cy.apiCall('admin', 'GET', `/users/${id}`).then((r) => { expect(r.body.datos.roles).to.deep.eq(['INVITADO']); expect(r.body.datos.detalle_aprendiz).to.eq(null); }));
    });
    it('CP-US-15: inexistente → 404 e ids inválidos → 400', () => {
      cy.apiCall('admin', 'GET', `/users/${INEXISTENTE}`).then((r) => esperarError(r, 404, 'Usuario no encontrado.'));
      IDS_INVALIDOS.forEach((v) => cy.apiCall('admin', 'GET', `/users/${v}`).then((r) => esperarError(r, 400, 'id debe ser un entero positivo.')));
    });
    it('CP-US-16: el CELADOR ve invitados pero no aprendices', () => {
      idDe('invitadoU').then((id) => cy.apiCall('celador', 'GET', `/users/${id}`).then((r) => esperarOk(r)));
      idDe('aprendizU').then((id) => cy.apiCall('celador', 'GET', `/users/${id}`).then((r) => esperarError(r, 403, SOLO_INVITADOS)));
    });
    ['aprendizU', 'invitadoU'].forEach((rol) => it(`CP-US-17: ${rol} no puede consultar el detalle de otros → 403`, () => {
      idDe('aprendizV').then((id) => cy.apiCall(rol, 'GET', `/users/${id}`).then((r) => esperarError(r, 403, SIN_PERMISO)));
    }));
  });

  describe('GET /users/me', () => {
    ['aprendizU', 'invitadoU', 'admin', 'jefe'].forEach((rol) => it(`CP-US-18: ${rol} consulta su propio perfil`, () => {
      cy.sesionApi(rol).then((s) => cy.apiCall(rol, 'GET', '/users/me').then((r) => {
        esperarOk(r);
        expect(r.body.datos.id).to.eq(s.id);
        expect(r.body.datos.correo).to.eq(s.usuario.correo);
        expect(r.body.datos.roles).to.deep.eq(s.roles);
      }));
    }));
    it('CP-US-19: el CELADOR puede ver su propio perfil', () => {
      cy.apiCall('celador', 'GET', '/users/me').then((r) => esperarOk(r));
    });
  });

  describe('PATCH /users/me (editar perfil)', () => {
    it('CP-US-20: el aprendiz actualiza su nombre → 200 y el cambio se ve en su perfil', () => {
      const nuevo = `Editado${unico()}`;
      const celular = `3${unico().slice(-9)}`;
      cy.apiCall('aprendizU', 'PATCH', '/users/me', { body: { primer_nombre: nuevo, n_celular: celular } }).then((r) => { esperarOk(r); expect(r.body.mensaje).to.eq('Perfil actualizado.'); });
      cy.apiCall('aprendizU', 'GET', '/users/me').then((r) => { expect(r.body.datos.primer_nombre).to.eq(nuevo); expect(r.body.datos.n_celular).to.eq(celular); });
    });
    it('CP-US-21: cuerpo vacío → 400', () => {
      cy.apiCall('aprendizU', 'PATCH', '/users/me', { body: {} }).then((r) => esperarError(r, 400, 'No hay datos para actualizar.'));
    });
    it('CP-US-22: el invitado no puede editar su perfil → 403', () => {
      cy.apiCall('invitadoU', 'PATCH', '/users/me', { body: { primer_nombre: 'X' } }).then((r) => esperarError(r, 403));
    });
    it('CP-US-23: editar el perfil deshabilita el cupo activo (regla observada)', () => {
      crearVehiculoApi('aprendizU', motoBase(), IMAGENES_MOTO.map((campo) => imagen(campo))).then((v) => {
        fijarCupo('aprendizU', 1, v);
        cy.apiCall('aprendizU', 'GET', '/quota/me').then((q) => expect(q.body.vehiculo.estado_cupo).to.eq(1));
        cy.apiCall('aprendizU', 'PATCH', '/users/me', { body: { n_celular: '3001112233' } }).then((r) => esperarOk(r));
        cy.apiCall('aprendizU', 'GET', '/quota/me').then((q) => expect(q.body.vehiculo.estado_cupo).to.eq(0));
      });
    });
    it('CP-US-24: correo ya usado por otra cuenta → 409', () => {
      crearAprendiz('aprendizCorreo').then((otro) => {
        cy.apiCall('aprendizU', 'PATCH', '/users/me', { body: { correo: otro.correo } }).then((r) => esperarError(r, 409, 'El registro ya existe.'));
      });
    });
    it('CP-US-25: los campos no editables (documento) se ignoran', () => {
      const antes = documentoDe('aprendizU');
      cy.apiCall('aprendizU', 'PATCH', '/users/me', { body: { numero_documento: '99999999', primer_nombre: 'Estable' } }).then((r) => esperarOk(r));
      cy.apiCall('aprendizU', 'GET', '/users/me').then((r) => expect(r.body.datos.numero_documento).to.eq(antes));
    });
  });

  describe('PATCH /users/me/password', () => {
    it('CP-US-27: cambia la contraseña → 200, la nueva sirve y la anterior ya no', () => {
      crearAprendiz('aprendizClave').then((a) => {
        const nueva = 'Clave12!';
        cy.apiCall('aprendizClave', 'PATCH', '/users/me/password', { body: { password_actual: a.password, password_nueva: nueva } })
          .then((r) => { esperarOk(r); expect(r.body.mensaje).to.eq('Contraseña actualizada.'); });
        cy.apiCall(null, 'POST', '/auth/storeAuthLogin', { body: { numero_documento: a.documento, password: nueva } }).then((l) => expect(l.status).to.eq(200));
        cy.apiCall(null, 'POST', '/auth/storeAuthLogin', { body: { numero_documento: a.documento, password: a.password } }).then((l) => expect(l.status).to.eq(401));
      });
    });
    it('CP-US-28: contraseña actual incorrecta → 401', () => {
      cy.apiCall('aprendizV', 'PATCH', '/users/me/password', { body: { password_actual: 'no-es-esta-123', password_nueva: 'ClaveNueva12345!' } })
        .then((r) => esperarError(r, 401, 'Contraseña actual inválida.'));
    });
    it('CP-US-29: nueva contraseña que incumple la política o campos faltantes → 400', () => {
      ['Ab1!', 'abcdefghij1!', 'Abcdefghij!', 'Abcdefghij1'].forEach((password_nueva) => {
        cy.apiCall('aprendizV', 'PATCH', '/users/me/password', { body: { password_actual: credenciales('aprendizV').password, password_nueva } })
          .then((r) => esperarError(r, 400));
      });
      ['password_actual', 'password_nueva'].forEach((campo) => {
        const body = { password_actual: 'x', password_nueva: 'ClaveNueva12345!' };
        delete body[campo];
        cy.apiCall('aprendizV', 'PATCH', '/users/me/password', { body }).then((r) => esperarError(r, 400, `Falta el campo obligatorio: ${campo}.`));
      });
    });
    it('CP-US-30: el invitado también puede cambiar su contraseña', () => {
      cy.apiCall('invitadoU', 'PATCH', '/users/me/password', { body: { password_actual: credenciales('invitadoU').password, password_nueva: 'ClaveInvitado12345!' } })
        .then((r) => esperarOk(r));
      cy.registrarCredenciales('invitadoU', { documento: documentoDe('invitadoU'), password: 'ClaveInvitado12345!' });
    });
  });

  describe('PATCH /users/me/estado (deshabilitar mi cuenta)', () => {
    it('CP-US-31: el usuario deshabilita su cuenta → 200 y ya no puede iniciar sesión', () => {
      crearAprendiz('aprendizBaja').then((a) => {
        cy.apiCall('aprendizBaja', 'PATCH', '/users/me/estado', { body: { estado: 0 } }).then((r) => { esperarOk(r); expect(r.body.mensaje).to.eq('Estado actualizado.'); });
        cy.apiCall(null, 'POST', '/auth/storeAuthLogin', { body: { numero_documento: a.documento, password: a.password } }).then((l) => esperarError(l, 403, 'Cuenta inactiva.'));
      });
    });
    it('CP-US-31b: el token de una cuenta deshabilitada deja de funcionar inmediatamente', () => {
      crearAprendiz('aprendizBaja2').then(() => {
        cy.sesionApi('aprendizBaja2').then((s) => {
          cy.apiCall('aprendizBaja2', 'PATCH', '/users/me/estado', { body: { estado: 0 } }).then((r) => esperarOk(r));
          cy.apiCall(null, 'GET', '/users/me', { auth: `Bearer ${s.token}` }).then((r) => expect(r.status, 'token de cuenta inactiva').to.be.oneOf([401, 403]));
        });
      });
    });
    it('CP-US-32: estado distinto de 0 o 1 → 400', () => {
      cy.apiCall('aprendizV', 'PATCH', '/users/me/estado', { body: { estado: 2 } }).then((r) => esperarError(r, 400, 'estado debe ser 0 o 1.'));
    });
  });

  describe('PATCH /users/:id/estado (matriz SECSS02-38 a SECSS02-41)', () => {
    afterEach(() => {
      idDe('aprendizV').then((id) => cy.apiCall('admin', 'PATCH', `/users/${id}/estado`, { body: { estado: 1 } }).then((r) => expect(r.status).to.eq(200)));
      idDe('celador2').then((id) => cy.apiCall('jefe', 'PATCH', `/users/${id}/estado`, { body: { estado: 1 } }).then((r) => expect(r.status).to.eq(200)));
      idDe('invitadoU').then((id) => cy.apiCall('admin', 'PATCH', `/users/${id}/estado`, { body: { estado: 1 } }).then((r) => expect(r.status).to.eq(200)));
    });
    it('CP-US-33: ADMIN puede deshabilitar y reactivar un aprendiz', () => {
      idDe('aprendizV').then((id) => {
        cy.apiCall('admin', 'PATCH', `/users/${id}/estado`, { body: { estado: 0 } }).then((r) => esperarOk(r));
        cy.apiCall('admin', 'GET', `/users/${id}`).then((r) => { expect(r.body.datos.estado).to.eq(0); expect(r.body.datos.cuenta_estado).to.eq(0); });
        cy.apiCall('admin', 'PATCH', `/users/${id}/estado`, { body: { estado: 1 } }).then((r) => esperarOk(r));
        cy.apiCall('admin', 'GET', `/users/${id}`).then((r) => { expect(r.body.datos.estado).to.eq(1); expect(r.body.datos.cuenta_estado).to.eq(1); });
      });
    });
    it('CP-US-33a: JEFE solo puede cambiar el estado de un CELADOR', () => {
      idDe('aprendizU').then((id) => cy.apiCall('jefe', 'PATCH', `/users/${id}/estado`, { body: { estado: 0 } }).then((r) => esperarError(r, 403)));
      idDe('celador2').then((id) => {
        cy.apiCall('jefe', 'PATCH', `/users/${id}/estado`, { body: { estado: 0 } }).then((r) => esperarOk(r));
        cy.apiCall('jefe', 'PATCH', `/users/${id}/estado`, { body: { estado: 1 } }).then((r) => esperarOk(r));
      });
    });
    it('CP-US-33b: ADMIN no puede cambiar el estado de un CELADOR', () => {
      idDe('celador2').then((id) => cy.apiCall('admin', 'PATCH', `/users/${id}/estado`, { body: { estado: 0 } }).then((r) => esperarError(r, 403)));
    });
    it('CP-US-33c: CELADOR puede reactivar un invitado inactivo; el vencimiento lo calcula el servidor', () => {
      idDe('invitadoU').then((id) => {
        cy.apiCall('admin', 'PATCH', `/users/${id}/estado`, { body: { estado: 0 } }).then((r) => esperarOk(r));
        cy.apiCall('celador', 'PATCH', `/users/${id}/estado`, { body: { estado: 1, expira_en: '2099-01-01' } }).then((r) => esperarOk(r));
        cy.apiCall('admin', 'GET', `/users/${id}`).then((r) => {
          expect(r.body.datos.estado).to.eq(1);
          expect(r.body.datos.cuenta_estado).to.eq(1);
          expect(r.body.datos.roles).to.include('INVITADO');
        });
      });
    });
    it('CP-US-33d: CELADOR no puede desactivar invitados; JEFE no puede reactivar invitados', () => {
      idDe('invitadoU').then((id) => {
        cy.apiCall('celador', 'PATCH', `/users/${id}/estado`, { body: { estado: 0 } }).then((r) => esperarError(r, 403));
        cy.apiCall('jefe', 'PATCH', `/users/${id}/estado`, { body: { estado: 1 } }).then((r) => esperarError(r, 403));
      });
    });
    ['aprendizU', 'invitadoU'].forEach((rol) => it(`CP-US-34: ${rol} no puede cambiar el estado de otros → 403`, () => {
      cy.apiCall(rol, 'PATCH', '/users/1/estado', { body: { estado: 0 } }).then((r) => esperarError(r, 403, SIN_PERMISO));
    }));
    it('CP-US-35: usuario inexistente → 404, estado inválido → 400, id inválido → 400', () => {
      cy.apiCall('admin', 'PATCH', `/users/${INEXISTENTE}/estado`, { body: { estado: 0 } }).then((r) => esperarError(r, 404, 'Usuario no encontrado.'));
      idDe('aprendizV').then((id) => cy.apiCall('admin', 'PATCH', `/users/${id}/estado`, { body: { estado: 5 } }).then((r) => esperarError(r, 400, 'estado debe ser 0 o 1.')));
      IDS_INVALIDOS.forEach((v) => cy.apiCall('admin', 'PATCH', `/users/${v}/estado`, { body: { estado: 0 } }).then((r) => esperarError(r, 400, 'id debe ser un entero positivo.')));
    });
  });

  describe('POST /users/celador (solo JEFE)', () => {
    it('CP-US-36: crea un celador nuevo → 201 con credenciales y el nuevo celador puede iniciar sesión', () => {
      const u = datosPersonal();
      cy.apiCall('jefe', 'POST', '/users/celador', { body: { usuario: u } }).then((r) => {
        esperarOk(r, 201);
        expect(r.body.mensaje).to.eq('Celador registrado y asignado.');
        expect(r.body.credenciales_temporales).to.include({ correo: u.correo });
        expect(r.body.credenciales_temporales.password).to.match(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/);
        cy.apiCall(null, 'POST', '/auth/storeAuthLogin', { body: { numero_documento: u.numero_documento, password: r.body.credenciales_temporales.password } })
          .then((l) => { expect(l.status).to.eq(200); expect(l.body.usuario.roles).to.include('CELADOR'); });
      });
    });
  it('CP-US-37: un INVITADO ya tiene un rol activo, no se le puede asignar CELADOR → 409', () => {
      idDe('invitadoU').then((id) => cy.apiCall('jefe', 'POST', '/users/celador', { body: { id_usuario: id } }).then((r) => {
        esperarError(r, 409);
        expect(r.body).to.not.have.property('credenciales_temporales');
      }));
    });
    it('CP-US-38: enviar ambos (id_usuario y usuario) o ninguno → 400', () => {
      cy.apiCall('jefe', 'POST', '/users/celador', { body: { id_usuario: 1, usuario: datosPersonal() } }).then((r) => esperarError(r, 400, 'Debe indicar id_usuario o usuario, pero no ambos.'));
      cy.apiCall('jefe', 'POST', '/users/celador', { body: {} }).then((r) => esperarError(r, 400, 'Debe indicar id_usuario o usuario, pero no ambos.'));
    });
    it('CP-US-39: usuario existente inexistente → 404', () => {
      cy.apiCall('jefe', 'POST', '/users/celador', { body: { id_usuario: INEXISTENTE } }).then((r) => esperarError(r, 404, 'Usuario no encontrado.'));
    });
    it('CP-US-40: no se puede asignar CELADOR a un aprendiz ni a un administrador → 409', () => {
      idDe('aprendizV').then((id) => cy.apiCall('jefe', 'POST', '/users/celador', { body: { id_usuario: id } }).then((r) => esperarError(r, 409, 'No se puede asignar CELADOR a un usuario privilegiado o aprendiz.')));
      idDe('admin').then((id) => cy.apiCall('jefe', 'POST', '/users/celador', { body: { id_usuario: id } }).then((r) => esperarError(r, 409, 'No se puede asignar CELADOR a un usuario privilegiado o aprendiz.')));
    });
    ['tipo_documento', 'numero_documento', 'primer_nombre', 'primer_apellido', 'n_celular', 'correo'].forEach((campo) => it(`CP-US-41: usuario nuevo sin ${campo} → 400`, () => {
      cy.apiCall('jefe', 'POST', '/users/celador', { body: { usuario: datosPersonal({ [campo]: undefined }) } }).then((r) => esperarError(r, 400, `Falta el campo obligatorio: ${campo}.`));
    }));
    it('CP-US-42: documento ya registrado → 409', () => {
      const u = datosPersonal();
      cy.apiCall('jefe', 'POST', '/users/celador', { body: { usuario: u } }).then((r) => esperarOk(r, 201));
      cy.apiCall('jefe', 'POST', '/users/celador', { body: { usuario: datosPersonal({ numero_documento: u.numero_documento }) } }).then((r) => esperarError(r, 409, 'El registro ya existe.'));
    });
    ['admin', 'celador', 'aprendizU', 'invitadoU'].forEach((rol) => it(`CP-US-43: ${rol} no puede crear celadores → 403`, () => {
      cy.apiCall(rol, 'POST', '/users/celador', { body: { usuario: datosPersonal() } }).then((r) => esperarError(r, 403, SIN_PERMISO));
    }));
  });

  describe('POST /users/jefe (solo ADMIN)', () => {
    it('CP-US-44: crea un jefe de seguridad nuevo → 201 con credenciales y rol JEFE_SEGURIDAD', () => {
      const u = datosPersonal();
      cy.apiCall('admin', 'POST', '/users/jefe', { body: { usuario: u } }).then((r) => {
        esperarOk(r, 201);
        expect(r.body.mensaje).to.eq('Jefe de seguridad registrado.');
        expect(r.body.credenciales_temporales.password).to.match(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/);
        cy.apiCall(null, 'POST', '/auth/storeAuthLogin', { body: { numero_documento: u.numero_documento, password: r.body.credenciales_temporales.password } })
          .then((l) => expect(l.body.usuario.roles).to.include('JEFE_SEGURIDAD'));
      });
    });
    it('CP-US-45: validaciones: ambos o ninguno → 400; existente inexistente → 404', () => {
      cy.apiCall('admin', 'POST', '/users/jefe', { body: {} }).then((r) => esperarError(r, 400, 'Debe indicar id_usuario o usuario, pero no ambos.'));
      cy.apiCall('admin', 'POST', '/users/jefe', { body: { id_usuario: INEXISTENTE } }).then((r) => esperarError(r, 404, 'Usuario no encontrado.'));
    });
    ['jefe', 'celador', 'aprendizU', 'invitadoU'].forEach((rol) => it(`CP-US-46: ${rol} no puede crear jefes → 403`, () => {
      cy.apiCall(rol, 'POST', '/users/jefe', { body: { usuario: datosPersonal() } }).then((r) => esperarError(r, 403, SIN_PERMISO));
    }));
  });

  describe('POST /users/asignar-celador', () => {
    it('CP-US-47: asignar dos veces el mismo celador al mismo jefe → 409', () => {
      cy.apiCall('jefe', 'POST', '/users/celador', { body: { usuario: datosPersonal() } }).then((c) => {
        idDe('jefe').then((jefe) => cy.apiCall('jefe', 'POST', '/users/asignar-celador', { body: { id_usuario_jefe_seguridad: jefe, id_usuario_celador: c.body.id_usuario } })
          .then((r) => esperarError(r, 409, 'El registro ya existe.')));
      });
    });
    ['id_usuario_jefe_seguridad', 'id_usuario_celador'].forEach((campo) => it(`CP-US-48: falta ${campo} → 400`, () => {
      const body = { id_usuario_jefe_seguridad: 1, id_usuario_celador: 1 };
      delete body[campo];
      cy.apiCall('admin', 'POST', '/users/asignar-celador', { body }).then((r) => esperarError(r, 400, `Falta el campo obligatorio: ${campo}.`));
    }));
    it('CP-US-49: ids inválidos → 400 y usuarios inexistentes → 400', () => {
      cy.apiCall('admin', 'POST', '/users/asignar-celador', { body: { id_usuario_jefe_seguridad: 'abc', id_usuario_celador: 1 } })
        .then((r) => esperarError(r, 400, 'id_usuario_jefe_seguridad debe ser un entero positivo.'));
      cy.apiCall('admin', 'POST', '/users/asignar-celador', { body: { id_usuario_jefe_seguridad: INEXISTENTE, id_usuario_celador: INEXISTENTE } })
        .then((r) => esperarError(r, 400, 'Una referencia indicada no existe.'));
    });
    ['celador', 'aprendizU', 'invitadoU'].forEach((rol) => it(`CP-US-50: ${rol} no puede asignar celadores → 403`, () => {
      cy.apiCall(rol, 'POST', '/users/asignar-celador', { body: { id_usuario_jefe_seguridad: 1, id_usuario_celador: 1 } }).then((r) => esperarError(r, 403, SIN_PERMISO));
    }));
    it('CP-US-51: asignar-celador rechaza a un usuario que no es CELADOR', () => {
      idDe('jefe').then((jefe) => idDe('aprendizV').then((aprendiz) => cy.apiCall('jefe', 'POST', '/users/asignar-celador', { body: { id_usuario_jefe_seguridad: jefe, id_usuario_celador: aprendiz } })
        .then((r) => expect(r.status, 'asignó como celador a un aprendiz').to.be.within(400, 499))));
    });
  });

  describe('Detalle académico: GET/PATCH /users/me/aprendiz y /users/:id/aprendiz', () => {
    it('CP-US-52: el aprendiz consulta su detalle académico', () => {
      cy.apiCall('aprendizU', 'GET', '/users/me/aprendiz').then((r) => {
        esperarOk(r);
        expect(r.body.datos).to.include.keys('ficha', 'direccion', 'fecha_vinculacion', 'nombre_centro', 'imagen_url_aprendiz');
      });
    });
    it('CP-US-53: el invitado no accede a /me/aprendiz → 403 y un usuario sin detalle recibe 404', () => {
      cy.apiCall('invitadoU', 'GET', '/users/me/aprendiz').then((r) => esperarError(r, 403));
      cy.apiCall('jefe', 'GET', '/users/me/aprendiz').then((r) => esperarError(r, 404, 'Detalle académico no encontrado.'));
    });
    it('CP-US-54: ADMIN, JEFE y CELADOR consultan el detalle de un aprendiz; el aprendiz no el de otro', () => {
      idDe('aprendizV').then((id) => {
        ['admin', 'jefe', 'celador'].forEach((rol) => cy.apiCall(rol, 'GET', `/users/${id}/aprendiz`).then((r) => esperarOk(r)));
        cy.apiCall('aprendizU', 'GET', `/users/${id}/aprendiz`).then((r) => esperarError(r, 403, SIN_PERMISO));
      });
      idDe('invitadoU').then((id) => cy.apiCall('admin', 'GET', `/users/${id}/aprendiz`).then((r) => esperarError(r, 404, 'Detalle académico no encontrado.')));
    });
    it('CP-US-55: el aprendiz actualiza su dirección → 200 y el cambio persiste', () => {
      const dir = `Carrera ${unico()} # 1-2`;
      cy.apiMultipart('aprendizU', '/users/me/aprendiz', { direccion: dir }, [], 'PATCH').then((r) => { esperarOk(r); expect(r.body.mensaje).to.eq('Detalle académico actualizado.'); });
      cy.apiCall('aprendizU', 'GET', '/users/me/aprendiz').then((r) => expect(r.body.datos.direccion).to.eq(dir));
    });
    it('CP-US-56: sin campos para actualizar → 400', () => {
      cy.apiMultipart('aprendizU', '/users/me/aprendiz', {}, [], 'PATCH').then((r) => esperarError(r, 400, 'No hay campos actualizables.'));
    });
    it('CP-US-57: subir una imagen nueva reemplaza la anterior; un PDF se rechaza', () => {
      cy.apiCall('aprendizU', 'GET', '/users/me/aprendiz').then((antes) => {
        cy.apiMultipart('aprendizU', '/users/me/aprendiz', {}, [imagen('imagen_url_aprendiz', 'jpg')], 'PATCH').then((r) => esperarOk(r));
        cy.apiCall('aprendizU', 'GET', '/users/me/aprendiz').then((d) => expect(d.body.datos.imagen_url_aprendiz).to.not.eq(antes.body.datos.imagen_url_aprendiz));
      });
      cy.apiMultipart('aprendizU', '/users/me/aprendiz', {}, [archivoPdf('imagen_url_aprendiz')], 'PATCH').then((r) => esperarError(r, 400));
    });
    it('CP-US-58: centro inexistente → 400', () => {
      cy.apiMultipart('aprendizU', '/users/me/aprendiz', { id_centro: INEXISTENTE }, [], 'PATCH').then((r) => esperarError(r, 400, 'Una referencia indicada no existe.'));
    });
    it('CP-US-59: solo el APRENDIZ puede editar su detalle académico; ADMIN recibe 403', () => {
      idDe('aprendizV').then((id) => {
        cy.apiMultipart('admin', `/users/${id}/aprendiz`, { ficha: `F${unico()}` }, [], 'PATCH').then((r) => esperarError(r, 403, SIN_PERMISO));
      });
    });
    ['aprendizU', 'invitadoU', 'celador', 'jefe'].forEach((rol) => it(`CP-US-60: ${rol} no puede editar el detalle académico ajeno → 403`, () => {
      cy.apiMultipart(rol, '/users/1/aprendiz', { direccion: 'X' }, [], 'PATCH').then((r) => esperarError(r, 403, SIN_PERMISO));
    }));
  });
});

// ======================================================================
// user · Interfaz (CP-UI-US)
// ======================================================================
describe('user · Interfaz', () => {
  before(() => crearAprendiz('aprendizUi').then(() => crearInvitadoComo('invitadoUi')));

  it('CP-UI-US-01: ADMIN y JEFE ven la tabla de usuarios con sus columnas', () => {
    ['admin', 'jefe'].forEach((rol) => {
      cy.uiLogin(rol);
      cy.visit('/usuarios');
      cy.contains('h2', 'Usuarios');
      ['Documento', 'Nombre', 'Rol(es)', 'Estado', 'Acciones'].forEach((t) => cy.contains('th', t));
      cy.get('tbody tr').should('have.length.at.least', 1);
    });
  });
  it('CP-UI-US-02: la tabla de aprendices agrega ficha, vinculación y terminación', () => {
    cy.uiLogin('admin');
    cy.visit('/aprendices');
    cy.contains('h2', 'Aprendices');
    ['Ficha', 'Vinculación', 'Terminación'].forEach((t) => cy.contains('th', t));
  });
  it('CP-UI-US-03: el CELADOR entra a invitados pero no a usuarios', () => {
    cy.uiLogin('celador');
    cy.visit('/invitados');
    cy.contains('h2', 'Invitados');
    cy.contains('th', 'Documento');
    cy.visit('/usuarios');
    cy.location('pathname').should('eq', '/unauthorized');
  });
  ['aprendizUi', 'invitadoUi'].forEach((rol) => it(`CP-UI-US-04: ${rol} no accede al directorio de usuarios`, () => {
    cy.uiLogin(rol);
    cy.visit('/usuarios');
    cy.location('pathname').should('eq', '/unauthorized');
  }));
  it('CP-UI-US-05: el buscador encuentra un aprendiz y su detalle muestra perfil e información académica', () => {
    cy.uiLogin('admin');
    cy.visit('/aprendices');
    buscar(documentoDe('aprendizUi'));
    cy.get('tbody tr').should('have.length', 1).first().find('a.btn-primary').click();
    cy.contains('h4', 'Perfil de Usuario');
    cy.contains('h4', 'Información Académica');
  });
  it('CP-UI-US-06: ADMIN deshabilita y habilita a un aprendiz desde su detalle', () => {
    cy.uiLogin('admin');
    cy.visit('/aprendices');
    buscar(documentoDe('aprendizUi'));
    cy.get('tbody tr').first().find('a.btn-primary').click();
    cy.contains('button', 'Deshabilitar').click();
    cy.get('.alert-info').should('contain', 'Usuario deshabilitado.');
    cy.contains('button', 'Habilitar').click();
    cy.get('.alert-info').should('contain', 'Usuario habilitado.');
  });
  it('CP-UI-US-07: el JEFE ve "Registrar" en celadores y el ADMIN en jefes de seguridad', () => {
    cy.uiLogin('jefe');
    cy.visit('/celadores');
    cy.contains('h2', 'Celadores');
    cy.contains('a', 'Registrar').click();
    cy.location('pathname').should('eq', '/celadores/nuevo');
    cy.contains('h2', 'Registrar o asignar celador');
    cy.uiLogin('admin');
    cy.visit('/jefes-seguridad');
    cy.contains('h2', 'Jefes de seguridad');
    cy.contains('a', 'Registrar').click();
    cy.location('pathname').should('eq', '/jefes-seguridad/nuevo');
    cy.contains('h2', 'Registrar o asignar jefe de seguridad');
  });
  [['celador', '/celadores/nuevo'], ['aprendizUi', '/celadores/nuevo'], ['jefe', '/jefes-seguridad/nuevo']].forEach(([rol, ruta]) => it(`CP-UI-US-08: ${rol} no accede a ${ruta}`, () => {
    cy.uiLogin(rol);
    cy.visit(ruta);
    cy.location('pathname').should('eq', '/unauthorized');
  }));
  it('CP-UI-US-09: el aprendiz ve su perfil con la opción de editar; el invitado no', () => {
    cy.uiLogin('aprendizUi');
    cy.visit('/perfil');
    cy.contains('h2', 'Mi información y cuenta');
    cy.contains('button', 'Editar').should('exist');
    cy.uiLogin('invitadoUi');
    cy.visit('/perfil');
    cy.contains('h2', 'Mi información y cuenta');
    cy.contains('button', 'Editar').should('not.exist');
  });
  it('CP-UI-US-10: el CELADOR puede abrir su perfil', () => {
    cy.uiLogin('celador');
    cy.visit('/perfil');
    cy.contains('h2', 'Mi información y cuenta');
  });
});
