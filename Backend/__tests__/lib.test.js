import {
  ROLES, PQRS, integer, page, required, error, actorId, assertEditableWithinWindow, EDIT_WINDOW_MINUTES,
} from '../lib.js';
import { mockRes } from './helpers/http.js';

describe('lib.integer — camino por camino', () => {
  test.each([['5', 5], [1, 1], ['100', 100]])('acepta %p → %p', (input, esperado) => {
    expect(integer(input, 'x')).toBe(esperado);
  });

  // Cubre las 3 condiciones del if: !isInteger, y parsed < 1 (con valor 0 y negativo)
  test.each([['abc'], [''], [undefined], ['1.5'], [0], [-3], [NaN]])('rechaza %p con status 400', (input) => {
    expect(() => integer(input, 'id')).toThrow('id debe ser un entero positivo.');
    try { integer(input, 'id'); } catch (e) { expect(e.status).toBe(400); }
  });
});

describe('lib.page — ramas de paginación', () => {
  test('sin parámetros usa pagina=1, limite=20, offset=0', () => {
    expect(page({})).toEqual({ pagina: 1, limite: 20, offset: 0 });
  });
  test('con parámetros calcula el offset', () => {
    expect(page({ pagina: '3', limite: '10' })).toEqual({ pagina: 3, limite: 10, offset: 20 });
  });
  test('limite = 100 es el valor frontera permitido', () => {
    expect(page({ limite: '100' }).limite).toBe(100);
  });
  test('limite = 101 supera el máximo → 400', () => {
    expect(() => page({ limite: '101' })).toThrow('limite no puede superar 100.');
  });
  test('pagina inválida propaga el error de integer', () => {
    expect(() => page({ pagina: '0' })).toThrow('pagina debe ser un entero positivo.');
  });
});

describe('lib.required — condición compuesta (undefined || null || "")', () => {
  test('no lanza si todos los campos tienen valor (incluye 0 y false)', () => {
    expect(() => required({ a: 0, b: false, c: 'x' }, ['a', 'b', 'c'])).not.toThrow();
  });
  test.each([[undefined], [null], ['']])('lanza 400 cuando el campo vale %p', (valor) => {
    expect(() => required({ campo: valor }, ['campo'])).toThrow('Falta el campo obligatorio: campo.');
  });
  test('lanza por el primer campo faltante', () => {
    expect(() => required({ a: 1 }, ['a', 'b', 'c'])).toThrow('obligatorio: b');
  });
  test('lista vacía de campos no valida nada', () => {
    expect(() => required({}, [])).not.toThrow();
  });
});

describe('lib.error — traducción de errores a HTTP', () => {
  let spy;
  beforeEach(() => { spy = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => spy.mockRestore());

  test('ER_DUP_ENTRY → 409', () => {
    const res = mockRes();
    error(res, { code: 'ER_DUP_ENTRY' });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ ok: false, mensaje: 'El registro ya existe.' });
  });
  test('ER_NO_REFERENCED_ROW_2 → 400', () => {
    const res = mockRes();
    error(res, { code: 'ER_NO_REFERENCED_ROW_2' });
    expect(res.status).toHaveBeenCalledWith(400);
  });
  test('error con status expone su mensaje', () => {
    const res = mockRes();
    error(res, Object.assign(new Error('boom'), { status: 418 }));
    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({ ok: false, mensaje: 'boom' });
  });
  test('error sin status → 500 y mensaje genérico (no filtra detalles internos)', () => {
    const res = mockRes();
    error(res, new Error('detalle SQL secreto'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, mensaje: 'Error interno del servidor.' });
  });
  test('err undefined no rompe (optional chaining)', () => {
    const res = mockRes();
    expect(() => error(res, undefined)).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('lib.actorId', () => {
  test('devuelve el id del token como entero', () => {
    expect(actorId({ user: { id: '12' } })).toBe(12);
  });
  test('token con id inválido → 400', () => {
    expect(() => actorId({ user: { id: 'x' } })).toThrow('usuario del token');
  });
});

describe('lib.assertEditableWithinWindow', () => {
  test('fecha inválida → 500', () => {
    try { assertEditableWithinWindow('no-es-fecha', 'El reporte'); throw new Error('no lanzó'); }
    catch (e) { expect(e.status).toBe(500); }
  });
  test('dentro de la ventana no lanza', () => {
    expect(() => assertEditableWithinWindow(new Date(), 'El reporte')).not.toThrow();
  });
  test('fuera de la ventana → 409', () => {
    const vieja = new Date(Date.now() - (EDIT_WINDOW_MINUTES + 1) * 60 * 1000);
    try { assertEditableWithinWindow(vieja, 'El reporte'); throw new Error('no lanzó'); }
    catch (e) { expect(e.status).toBe(409); expect(e.message).toContain('El reporte'); }
  });
});

describe('constantes congeladas', () => {
  test('ROLES y PQRS no se pueden mutar', () => {
    expect(Object.isFrozen(ROLES)).toBe(true);
    expect(Object.isFrozen(PQRS)).toBe(true);
  });
});
