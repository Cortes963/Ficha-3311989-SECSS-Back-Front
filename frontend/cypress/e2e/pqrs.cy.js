// frontend/cypress/e2e/pqrs.cy.js
// Pruebas de CAJA NEGRA (E2E) del módulo PQRS: se prueba solo lo que ve y hace el usuario.
// Requisitos: backend (puerto 4000), frontend (puerto 5173) y MySQL corriendo, con los usuarios semilla.

const API = () => Cypress.expose('apiUrl');

// Inicia sesión por la pantalla de login y guarda la sesión (token en localStorage)
const loginComo = (documento) =>
  cy.session(documento, () => {
    cy.visit('/login');
    cy.get('#documento').type(documento);
    cy.get('#password').type(Cypress.expose('password'), { log: false });
    cy.contains('button', 'Iniciar Sesión').click();
    cy.location('pathname').should('eq', '/');
  });

// Crea una PQRS directo por la API (preparación de datos) y devuelve su id
const crearPqrsApi = (documento, asunto) =>
  cy
    .request('POST', `${API()}/auth/storeAuthLogin`, {
      numero_documento: documento,
      password: Cypress.expose('password'),
    })
    .then(({ body }) =>
      cy.request({
        method: 'POST',
        url: `${API()}/pqrs`,
        headers: { Authorization: `Bearer ${body.token}` },
        body: { asunto, cuerpo: 'Creada por Cypress' },
      })
    )
    .then((res) => res.body.id_pqrs);

describe('Caja Negra - PQRS sin sesión', () => {
  it('CP-PQRS-01: sin iniciar sesión, /pqrs redirige al login', () => {
    cy.visit('/pqrs');
    cy.location('pathname').should('eq', '/login');
  });
});

describe('Caja Negra - PQRS como APRENDIZ', () => {
  beforeEach(() => {
    loginComo(Cypress.expose('docAprendiz'));
  });

  it('CP-PQRS-02: carga "Mis PQRS" desde el backend', () => {
    cy.intercept('GET', '**/api/pqrs?*').as('lista');
    cy.visit('/pqrs');
    cy.wait('@lista').its('response.statusCode').should('eq', 200);
    cy.contains('Mis PQRS').should('be.visible');
    cy.contains('a', 'Registrar PQRS').should('be.visible');
  });

  it('CP-PQRS-03: radica una PQRS correctamente', () => {
    const asunto = 'Cypress PQRS ' + Date.now();
    cy.intercept('POST', '**/api/pqrs').as('crear');
    cy.visit('/pqrs/nuevo');

    cy.get('#asunto').type(asunto);
    cy.get('#cuerpo').type('Descripción de prueba E2E');
    cy.contains('button', 'Radicar PQRS').click();

    cy.wait('@crear').its('response.statusCode').should('eq', 201);
    cy.get('.alert-success').should('contain', 'Radicado');
  });

  it('CP-PQRS-04: NO radica con los campos vacíos', () => {
    cy.intercept('POST', '**/api/pqrs').as('crear');
    cy.visit('/pqrs/nuevo');

    cy.contains('button', 'Radicar PQRS').click();

    cy.get('#asunto:invalid').should('exist');       // validación del navegador (required)
    cy.get('@crear.all').should('have.length', 0);   // no se envió ninguna petición
  });

  it('CP-PQRS-05: la PQRS radicada aparece en "Mis PQRS" con estado Radicado', () => {
    const asunto = 'Cypress Lista ' + Date.now();
    crearPqrsApi(Cypress.expose('docAprendiz'), asunto);

    cy.visit('/pqrs');
    cy.contains('tr', asunto).within(() => {
      cy.contains('Radicado').should('be.visible');
    });
  });

  it('CP-PQRS-06: edita su PQRS dentro de los primeros 5 minutos', () => {
    const asunto = 'Cypress Editar ' + Date.now();
    cy.intercept('PUT', '**/api/pqrs/*').as('editar');

    crearPqrsApi(Cypress.expose('docAprendiz'), asunto).then((id) => {
      cy.visit(`/pqrs/${id}`);
    });

    cy.contains('button', 'Editar PQRS').click();
    cy.get('#asunto').clear().type(asunto + ' (editada)');
    cy.contains('button', 'Guardar').click();

    cy.wait('@editar').its('response.statusCode').should('eq', 200);
    cy.contains('PQRS actualizada.').should('be.visible');
  });

  it('CP-PQRS-07: el aprendiz NO ve el formulario para responder', () => {
    crearPqrsApi(Cypress.expose('docAprendiz'), 'Cypress SinResponder ' + Date.now()).then((id) => {
      cy.visit(`/pqrs/${id}`);
    });
    cy.contains('Detalle de PQRS').should('be.visible');
    cy.contains('Responder PQRS').should('not.exist');
  });

  it('CP-PQRS-08: el aprendiz no puede entrar a /reportes (sin permiso)', () => {
    cy.visit('/reportes');
    cy.location('pathname').should('eq', '/unauthorized');
    cy.contains('No tienes permiso para esta sección').should('be.visible');
  });
});

describe('Caja Negra - PQRS como ADMINISTRADOR', () => {
  beforeEach(() => {
    loginComo(Cypress.expose('docAdmin'));
  });

  it('CP-PQRS-09: el administrador ve todas las PQRS y no puede radicar', () => {
    cy.intercept('GET', '**/api/pqrs?*').as('lista');
    cy.visit('/pqrs');
    cy.wait('@lista').its('response.statusCode').should('eq', 200);
    cy.contains('th', 'Solicitante').should('be.visible');
    cy.contains('Registrar PQRS').should('not.exist');
  });

  it('CP-PQRS-10: el administrador no puede entrar a /pqrs/nuevo', () => {
    cy.visit('/pqrs/nuevo');
    cy.location('pathname').should('eq', '/unauthorized');
  });

  it('CP-PQRS-11: el administrador responde una PQRS y queda Resuelta', () => {
    cy.intercept('POST', '**/api/pqrs/*/respuesta').as('responder');

    crearPqrsApi(Cypress.expose('docAprendiz'), 'Cypress Responder ' + Date.now()).then((id) => {
      cy.visit(`/pqrs/${id}`);
    });

    cy.contains('h3', 'Responder PQRS').should('be.visible');
    cy.get('textarea').type('Respuesta de prueba del administrador');
    cy.contains('button', 'Enviar respuesta').click();

    cy.wait('@responder').its('response.statusCode').should('eq', 201);
    cy.contains('Respuesta registrada.').should('be.visible');
  });
});