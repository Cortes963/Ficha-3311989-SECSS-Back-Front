// Pruebas de caja negra del módulo auth: login, registro público de aprendices y recuperación de contraseña.
// API (CP-AU) e interfaz (CP-UI-AU). Los usuarios desechables se crean por la API para no tocar los reales.
import {
  INEXISTENTE, esperarError, esperarOk, defecto, crearAprendiz, datosAprendiz, idCentro, imagenesAprendiz,
  IMAGENES_APRENDIZ, imagenGrande, archivoPdf, imagen, imagenMimeFalso, unico,
} from '../support/helpers';
import { leerConfig, credenciales } from '../support/usuarios';

const SIN_PERMISO = 'No tiene permisos para esta operación.';
const login = (documento, password) => cy.apiCall(null, 'POST', '/auth/storeAuthLogin', { body: { numero_documento: documento, password } });
const decodificar = (token) => JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
const registrar = (campos, archivos = imagenesAprendiz()) => cy.apiMultipart(null, '/auth/storeAuthRegister', campos, archivos);
const RESET_ACTIVO = () => leerConfig('resetTokenHabilitado') === true;

// ======================================================================
// auth · API (CP-AU)
// ======================================================================
describe('auth · API', () => {
  describe('POST /auth/storeAuthLogin', () => {
    it('CP-AU-01: credenciales válidas → 200 con token y datos del usuario', () => {
      const c = credenciales('celador');
      login(c.documento, c.password).then((r) => {
        esperarOk(r);
        expect(r.body.token).to.be.a('string').and.not.be.empty;
        expect(r.body.usuario).to.include.keys('id', 'nombre', 'correo', 'roles');
        expect(r.body.usuario.roles).to.include('CELADOR');
        expect(r.body.usuario).to.not.have.any.keys('password', 'password_hash');
      });
    });
    it('CP-AU-02: el JWT contiene el id y los roles del usuario y una expiración', () => {
      const c = credenciales('jefe');
      login(c.documento, c.password).then((r) => {
        const p = decodificar(r.body.token);
        expect(p.id).to.eq(r.body.usuario.id);
        expect(p.roles).to.deep.eq(r.body.usuario.roles);
        expect(p.exp).to.be.greaterThan(p.iat);
      });
    });
    it('CP-AU-03: contraseña incorrecta → 401 sin detalle', () => {
      login(credenciales('celador').documento, 'clave-incorrecta-123').then((r) => esperarError(r, 401, 'Credenciales inválidas.'));
    });
    it('CP-AU-04: documento inexistente → 401 con el mismo mensaje (no revela si existe)', () => {
      login('00000000000', 'cualquier-clave-123').then((r) => esperarError(r, 401, 'Credenciales inválidas.'));
    });
    ['numero_documento', 'password'].forEach((campo) => it(`CP-AU-05: falta ${campo} → 400`, () => {
      const body = { numero_documento: '1', password: 'x' };
      delete body[campo];
      cy.apiCall(null, 'POST', '/auth/storeAuthLogin', { body }).then((r) => esperarError(r, 400, `Falta el campo obligatorio: ${campo}.`));
    }));
    it('CP-AU-05b: JSON malformado → 400 con mensaje claro, nunca 500', () => {
      cy.request({
        method: 'POST', url: `${leerConfig('apiUrl')}/auth/storeAuthLogin`,
        headers: { 'Content-Type': 'application/json' }, body: '{', failOnStatusCode: false,
      }).then((r) => {
        expect(r.status).to.eq(400);
        expect(r.body.mensaje).to.include('JSON malformado');
      });
    });
    it('CP-AU-06: intento de inyección SQL en el documento → 401, nunca 500', () => {
      login("' OR '1'='1", 'x').then((r) => esperarError(r, 401, 'Credenciales inválidas.'));
    });
    it('CP-AU-07: cuenta inactiva → 403', () => {
      crearAprendiz('aprendizInactivo').then((a) => {
        cy.apiCall('admin', 'PATCH', `/users/${a.id_usuario}/estado`, { body: { estado: 0 } }).then((r) => esperarOk(r));
        login(a.documento, a.password).then((r) => esperarError(r, 403, 'Cuenta inactiva.'));
      });
    });
    it('CP-AU-08: tres fallos seguidos bloquean la cuenta (423) aunque luego se use la clave correcta', () => {
      crearAprendiz('aprendizBloqueo').then((a) => {
        [1, 2, 3].forEach(() => login(a.documento, 'incorrecta-123').then((r) => esperarError(r, 401)));
        login(a.documento, a.password).then((r) => esperarError(r, 423, 'Cuenta bloqueada temporalmente.'));
      });
    });
    it('CP-AU-09: un login exitoso reinicia el contador de fallos', () => {
      crearAprendiz('aprendizReinicio').then((a) => {
        login(a.documento, 'mala-1234567').then((r) => esperarError(r, 401));
        login(a.documento, 'mala-1234567').then((r) => esperarError(r, 401));
        login(a.documento, a.password).then((r) => esperarOk(r));
        login(a.documento, 'mala-1234567').then((r) => esperarError(r, 401));
        login(a.documento, 'mala-1234567').then((r) => esperarError(r, 401));
        login(a.documento, a.password).then((r) => esperarOk(r));
      });
    });
    it.skip('CP-AU-10: cuenta temporal expirada → 403 "La cuenta temporal ya expiró." (requiere alterar expira_en en la base)', () => {});
    it('CP-AU-11: contraseña no textual (número) responde 4xx, nunca 500', () => {
      cy.apiCall(null, 'POST', '/auth/storeAuthLogin', { body: { numero_documento: credenciales('celador').documento, password: 12345678901 } })
        .then((r) => expect(r.status).to.be.within(400, 499));
    });
  });

  describe('POST /auth/storeAuthRegister (registro público de aprendices)', () => {
    let centro;
    before(() => { idCentro().then((c) => { centro = c; }); });

    it('CP-AU-13: registro válido → 201, el usuario inicia sesión como APRENDIZ y queda su detalle académico', () => {
      const d = datosAprendiz(centro);
      registrar(d).then((r) => {
        esperarOk(r, 201);
        expect(r.body.mensaje).to.eq('Usuario registrado.');
        expect(r.body.id_usuario).to.be.a('number');
        login(d.numero_documento, d.password).then((l) => { expect(l.status).to.eq(200); expect(l.body.usuario.roles).to.deep.eq(['APRENDIZ']); });
        cy.apiCall('admin', 'GET', `/users/${r.body.id_usuario}`).then((u) => {
          expect(u.body.datos.detalle_aprendiz.ficha).to.eq(d['detalle_aprendiz[ficha]']);
          expect(u.body.datos.detalle_aprendiz.id_centro).to.eq(centro);
        });
      });
    });
    ['INVITADO', 'ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR'].forEach((rol) => it(`CP-AU-14: nombre_rol=${rol} → 403`, () => {
      registrar(datosAprendiz(centro, { nombre_rol: rol })).then((r) => esperarError(r, 403, 'El registro público solo permite APRENDIZ.'));
    }));
    it('CP-AU-15: una contraseña válida de exactamente 8 caracteres debe registrarse (SECSS02-11/24)', () => {
      registrar(datosAprendiz(centro, { password: 'Clave12!' })).then((r) => esperarOk(r, 201));
    });
    [
      ['menos de 8 caracteres', 'Ab1!'],
      ['sin mayúscula', 'abcdefghij1!'],
      ['sin número', 'Abcdefghij!'],
      ['sin símbolo', 'Abcdefghij1'],
    ].forEach(([caso, password]) => it(`CP-AU-15b: contraseña ${caso} → 400`, () => {
      registrar(datosAprendiz(centro, { password })).then((r) => esperarError(r, 400));
    }));
    ['tipo_documento', 'numero_documento', 'primer_nombre', 'primer_apellido', 'n_celular', 'correo', 'password', 'nombre_rol'].forEach((campo) => {
      it(`CP-AU-16: falta ${campo} → 400`, () => {
        registrar(datosAprendiz(centro, { [campo]: undefined })).then((r) => esperarError(r, 400, `Falta el campo obligatorio: ${campo}.`));
      });
    });
    ['id_centro', 'ficha', 'direccion', 'fecha_vinculacion'].forEach((campo) => it(`CP-AU-17: falta detalle_aprendiz.${campo} → 400`, () => {
      registrar(datosAprendiz(centro, { [`detalle_aprendiz[${campo}]`]: undefined })).then((r) => esperarError(r, 400, `Falta el campo obligatorio: ${campo}.`));
    }));
    IMAGENES_APRENDIZ.forEach((campo) => it(`CP-AU-18: falta la imagen ${campo} → 400`, () => {
      registrar(datosAprendiz(centro), imagenesAprendiz().filter((a) => a.campo !== campo))
        .then((r) => esperarError(r, 400, `Falta el archivo obligatorio: ${campo}.`));
    }));
    it('CP-AU-19: documento o correo ya registrados → 409', () => {
      const a = datosAprendiz(centro);
      registrar(a).then((r) => esperarOk(r, 201));
      registrar(datosAprendiz(centro, { numero_documento: a.numero_documento })).then((r) => esperarError(r, 409, 'El registro ya existe.'));
      registrar(datosAprendiz(centro, { correo: a.correo })).then((r) => esperarError(r, 409, 'El registro ya existe.'));
    });
    it('CP-AU-20: centro inexistente → 400', () => {
      registrar(datosAprendiz(INEXISTENTE)).then((r) => esperarError(r, 400));
    });
    it('CP-AU-21: archivos inválidos (PDF, mayor a 5 MB) → 400', () => {
      registrar(datosAprendiz(centro), [archivoPdf(IMAGENES_APRENDIZ[0]), imagen(IMAGENES_APRENDIZ[1]), imagen(IMAGENES_APRENDIZ[2])])
        .then((r) => esperarError(r, 400));
      registrar(datosAprendiz(centro), [imagenGrande(IMAGENES_APRENDIZ[0]), imagen(IMAGENES_APRENDIZ[1]), imagen(IMAGENES_APRENDIZ[2])])
        .then((r) => esperarError(r, 400));
      registrar(datosAprendiz(centro), [imagenMimeFalso(IMAGENES_APRENDIZ[0]), imagen(IMAGENES_APRENDIZ[1]), imagen(IMAGENES_APRENDIZ[2])])
        .then((r) => esperarError(r, 400));
    });
    it('CP-AU-22: un registro fallido no deja el documento ocupado (rollback)', () => {
      const a = datosAprendiz(centro);
      registrar(a).then((r) => esperarOk(r, 201));
      const b = datosAprendiz(centro, { correo: a.correo });
      registrar(b).then((r) => esperarError(r, 409));
      registrar({ ...b, correo: `reintento.${unico()}@prueba.test` }).then((r) => esperarOk(r, 201));
    });
  });

  describe('POST /auth/forgot-password y /auth/reset-password', () => {
    it('CP-AU-24: correo existente → 200 y respuesta genérica (o token si el backend lo devuelve en desarrollo)', () => {
      crearAprendiz('aprendizRecuperar').then((a) => {
        cy.apiCall(null, 'POST', '/auth/forgot-password', { body: { correo: a.correo } }).then((r) => {
          esperarOk(r);
          if (RESET_ACTIVO()) expect(r.body.token).to.be.a('string');
          else expect(r.body.mensaje).to.eq('Si el correo existe, recibirá instrucciones de recuperación.');
        });
      });
    });
    it('CP-AU-25: correo inexistente → mismo 200 genérico (no revela si la cuenta existe)', () => {
      cy.apiCall(null, 'POST', '/auth/forgot-password', { body: { correo: `no.existe.${unico()}@prueba.test` } }).then((r) => {
        esperarOk(r);
        expect(r.body.mensaje).to.eq('Si el correo existe, recibirá instrucciones de recuperación.');
      });
    });
    it('CP-AU-26: forgot-password sin correo → 400', () => {
      cy.apiCall(null, 'POST', '/auth/forgot-password', { body: {} }).then((r) => esperarError(r, 400, 'Falta el campo obligatorio: correo.'));
    });
    ['token', 'password'].forEach((campo) => it(`CP-AU-27: reset-password sin ${campo} → 400`, () => {
      const body = { token: 'abc', password: 'NuevaClave12345!' };
      delete body[campo];
      cy.apiCall(null, 'POST', '/auth/reset-password', { body }).then((r) => esperarError(r, 400, `Falta el campo obligatorio: ${campo}.`));
    }));
    it('CP-AU-27b: reset-password rechaza contraseña que incumple la política → 400', () => {
      cy.apiCall(null, 'POST', '/auth/reset-password', { body: { token: 'abc', password: 'Abcdefghij1' } })
        .then((r) => esperarError(r, 400));
    });
    it('CP-AU-27c: reset-password con token inventado → 400', () => {
      cy.apiCall(null, 'POST', '/auth/reset-password', { body: { token: 'a'.repeat(64), password: 'NuevaClave12345!' } })
        .then((r) => esperarError(r, 400, 'Token inválido o expirado.'));
    });
    (RESET_ACTIVO() ? it : it.skip)('CP-AU-28: flujo completo de recuperación (requiere resetTokenHabilitado y PASSWORD_RESET_RETURN_TOKEN=true)', () => {
      crearAprendiz('aprendizReset').then((a) => {
        cy.apiCall(null, 'POST', '/auth/forgot-password', { body: { correo: a.correo } }).then((f) => {
          const token = f.body.token;
          const nueva = 'ClaveRecuperada12345!';
          cy.apiCall(null, 'POST', '/auth/reset-password', { body: { token, password: nueva } }).then((r) => { esperarOk(r); expect(r.body.mensaje).to.eq('Contraseña actualizada.'); });
          login(a.documento, nueva).then((l) => expect(l.status).to.eq(200));
          login(a.documento, a.password).then((l) => expect(l.status).to.eq(401));
          cy.apiCall(null, 'POST', '/auth/reset-password', { body: { token, password: 'OtraClave12345678!' } })
            .then((r) => esperarError(r, 400, 'Token inválido o expirado.'));
        });
      });
    });
  });
});

// ======================================================================
// auth · Interfaz (CP-UI-AU)
// ======================================================================
describe('auth · Interfaz', () => {
  beforeEach(() => { cy.clearAllLocalStorage(); });

  it('CP-UI-AU-01: la pantalla de login muestra los campos, el enlace de recuperación y el de registro', () => {
    cy.visit('/login');
    cy.contains('h3', /Bienvenidos a\s+SECSS/);
    cy.get('#documento').should('have.attr', 'placeholder', 'Ej: 1028342536');
    cy.get('#password').should('have.attr', 'type', 'password');
    cy.contains('a', '¿Has olvidado tu contraseña?').should('have.attr', 'href', '/recuperar');
    cy.contains('a', 'Regístrate').should('have.attr', 'href', '/registro');
  });
  it('CP-UI-AU-02: un documento con letras bloquea el envío', () => {
    cy.intercept('POST', '**/auth/storeAuthLogin').as('login');
    cy.visit('/login');
    cy.get('#documento').type('abc123');
    cy.get('#password').type('cualquier-clave');
    cy.contains('button', 'Iniciar Sesión').click();
    cy.get('#documento:invalid').should('exist');
    cy.get('@login.all').should('have.length', 0);
  });
  it('CP-UI-AU-03: un login correcto guarda la sesión y entra al inicio', () => {
    const c = credenciales('celador');
    cy.visit('/login');
    cy.get('#documento').type(c.documento);
    cy.get('#password').type(c.password, { log: false });
    cy.contains('button', 'Iniciar Sesión').click();
    cy.location('pathname').should('eq', '/');
    cy.window().its('localStorage').invoke('getItem', 'secss_token').should('be.a', 'string');
  });
  it('CP-UI-AU-04: la sesión se mantiene al recargar la página', () => {
    const c = credenciales('celador');
    cy.visit('/login');
    cy.get('#documento').type(c.documento);
    cy.get('#password').type(c.password, { log: false });
    cy.contains('button', 'Iniciar Sesión').click();
    cy.location('pathname').should('eq', '/');
    cy.reload();
    cy.location('pathname').should('eq', '/');
  });
  it('CP-UI-AU-05: tras tres fallos la interfaz muestra que la cuenta está bloqueada', () => {
    crearAprendiz('aprendizBloqueoUi').then((a) => {
      cy.visit('/login');
      [1, 2, 3].forEach(() => {
        cy.get('#documento').clear().type(a.documento);
        cy.get('#password').clear().type('incorrecta-123');
        cy.contains('button', 'Iniciar Sesión').click();
        cy.get('.alert-danger').should('contain', 'Credenciales inválidas.');
      });
      cy.get('#password').clear().type(a.password, { log: false });
      cy.contains('button', 'Iniciar Sesión').click();
      cy.get('.alert-danger').should('contain', 'Cuenta bloqueada temporalmente.');
    });
  });
  it('CP-UI-AU-06: una cuenta inactiva ve el aviso correspondiente', () => {
    crearAprendiz('aprendizInactivoUi').then((a) => {
      cy.apiCall('admin', 'PATCH', `/users/${a.id_usuario}/estado`, { body: { estado: 0 } }).then((r) => esperarOk(r));
      cy.visit('/login');
      cy.get('#documento').type(a.documento);
      cy.get('#password').type(a.password, { log: false });
      cy.contains('button', 'Iniciar Sesión').click();
      cy.get('.alert-danger').should('contain', 'Cuenta inactiva.');
    });
  });
  it('CP-UI-AU-07: desde el login se llega a recuperar contraseña y al registro', () => {
    cy.visit('/login');
    cy.contains('a', '¿Has olvidado tu contraseña?').click();
    cy.location('pathname').should('eq', '/recuperar');
    cy.contains('h1', 'Recuperar contraseña');
    cy.visit('/login');
    cy.contains('a', 'Regístrate').click();
    cy.location('pathname').should('eq', '/registro');
    cy.contains('h1', 'Registro de aprendiz SECSS');
    cy.get('.alert-info').should('contain', 'El registro público crea únicamente usuarios APRENDIZ.');
  });
  (RESET_ACTIVO() ? it.skip : it)('CP-UI-AU-08: recuperar contraseña muestra el aviso genérico sin revelar si el correo existe', () => {
    cy.visit('/recuperar');
    cy.get('input').first().type(`no.existe.${unico()}@prueba.test`);
    cy.contains('button', /enviar|recuperar|solicitar/i).click();
    cy.contains('Si el correo existe, recibirá instrucciones de recuperación.');
  });
  it('CP-UI-AU-09: una ruta protegida sin sesión redirige al login', () => {
    cy.visit('/perfil');
    cy.location('pathname').should('eq', '/login');
  });
});
