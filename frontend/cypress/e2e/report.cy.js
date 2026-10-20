
// Pruebas de caja negra (E2E) del módulo Reportes.
// Validan los flujos visibles y las respuestas HTTP usando la API real.
const crearReporteApi = (asunto, cuerpo) =>
  cy.apiCall('celador', 'POST', '/reportes', { body: { asunto, cuerpo } }).then((response) => {
    expect(response.status, 'radicación del reporte').to.eq(201);
    return response.body.id_reporte;
  });

describe('Caja Negra - Reportes sin sesión', () => {
  it('CP-REP-01: sin sesión, /reportes redirige al login', () => {
    cy.visit('/reportes');
    cy.location('pathname').should('eq', '/login');
  });
});

describe('Caja Negra - Reportes como CELADOR', () => {
  beforeEach(() => {
    cy.uiLogin('celador');
  });

  it('CP-REP-02: consulta la lista y puede iniciar el registro', () => {
    cy.intercept('GET', '**/api/reportes?*').as('lista');
    cy.visit('/reportes');
    cy.wait('@lista').its('response.statusCode').should('eq', 200);
    cy.contains('h2', 'Reportes').should('be.visible');
    cy.contains('a', 'Registrar reporte').should('be.visible').click();
    cy.location('pathname').should('eq', '/reportes/nuevo');
    cy.contains('h2', 'Registrar reporte').should('be.visible');
  });

  it('CP-REP-03: registra un reporte con los campos obligatorios', () => {
    const asunto = `Cypress Reporte ${Date.now()}`;
    cy.intercept('POST', '**/api/reportes').as('crear');
    cy.visit('/reportes/nuevo');
    cy.get('#asunto').type(asunto);
    cy.get('#cuerpo').type('Descripción E2E del reporte');
    cy.contains('button', 'Guardar reporte').click();
    cy.wait('@crear').then(({ response }) => {
      expect(response.statusCode).to.eq(201);
      expect(response.body.ok).to.eq(true);
    });
    cy.get('#asunto').should('have.value', '');
    cy.get('#cuerpo').should('have.value', '');
  });

  it('CP-REP-04: no registra el reporte cuando faltan los campos obligatorios', () => {
    cy.intercept('POST', '**/api/reportes').as('crear');
    cy.visit('/reportes/nuevo');
    cy.contains('button', 'Guardar reporte').click();
    cy.get('#asunto:invalid').should('exist');
    cy.get('@crear.all').should('have.length', 0);
  });

  it('CP-REP-05: consulta y edita su propio reporte dentro de los primeros 5 minutos', () => {
    const asunto = `Cypress Editar Reporte ${Date.now()}`;
    crearReporteApi(asunto, 'Cypress Descripción original').then((id) => {
      cy.intercept('PUT', `**/api/reportes/${id}`).as('editar');
      cy.visit(`/reportes/${id}`);
    });
    cy.contains('h2', 'Consultar y editar reporte propio').should('be.visible');
    cy.get('#asunto').clear().type(`${asunto} editado`);
    cy.get('#cuerpo').clear().type('Descripción actualizada desde Cypress');
    cy.contains('button', 'Guardar cambios').click();
    cy.wait('@editar').then(({ response }) => {
      expect(response.statusCode).to.eq(200);
      expect(response.body.ok).to.eq(true);
    });
  });
});

describe('Caja Negra - Reportes como JEFE DE SEGURIDAD', () => {
  beforeEach(() => {
    cy.uiLogin('jefe');
  });

  it('CP-REP-06: puede consultar la lista, pero no registrar reportes', () => {
    cy.visit('/reportes');
    cy.contains('h2', 'Reportes').should('be.visible');
    cy.contains('a', 'Registrar reporte').should('not.exist');
    cy.visit('/reportes/nuevo');
    cy.location('pathname').should('eq', '/unauthorized');
  });

  it('CP-REP-07: consulta el detalle de un reporte ajeno y no puede editarlo', () => {
    const asunto = `Cypress Consulta Jefe ${Date.now()}`;
    crearReporteApi(asunto, 'Reporte creado por el celador').then((id) => {
      cy.visit(`/reportes/${id}`);
    });
    cy.contains('h2', 'Consultar reporte').should('be.visible');
    cy.get('#asunto').should('have.value', asunto).and('have.attr', 'readonly');
    cy.get('#cuerpo').should('have.attr', 'readonly');
    cy.contains('button', 'Guardar cambios').should('not.exist');
  });
});

describe('Caja Negra - Reportes con rol sin permiso', () => {
  it('CP-REP-08: el aprendiz no puede consultar /reportes', () => {
    cy.uiLogin('aprendiz');
    cy.visit('/reportes');
    cy.location('pathname').should('eq', '/unauthorized');
  });
});
