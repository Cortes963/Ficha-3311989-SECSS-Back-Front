// Backend/controller/<modulo>/nombre.controller.js
import db from '../../db.js';

// CONSULTAR (lista)
export const listar = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tabla WHERE estado = 1');
    res.json({ ok: true, data: rows });
  } catch (error) {
    console.error('Error al listar:', error);
    res.status(500).json({ ok: false, mensaje: 'Error al consultar.' });
  }
};

// CONSULTAR (uno por ID)
export const obtenerPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM tabla WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'No encontrado.' });
    }
    res.json({ ok: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error al consultar.' });
  }
};

// REGISTRAR
export const crear = async (req, res) => {
  const { campo_texto, campo_numero, campo_fecha } = req.body;

  if (!campo_texto || !campo_numero) {
    return res.status(400).json({ ok: false, mensaje: 'Faltan campos obligatorios.' });
  }

  try {
    const [resultado] = await db.query(
      'INSERT INTO tabla (campo_texto, campo_numero, campo_fecha) VALUES (?, ?, ?)',
      [campo_texto, campo_numero, campo_fecha]
    );
    res.status(201).json({ ok: true, mensaje: 'Registrado correctamente.', id: resultado.insertId });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ ok: false, mensaje: 'Alguna referencia no existe.' });
    }
    res.status(500).json({ ok: false, mensaje: 'Error al registrar.' });
  }
};

// MODIFICAR
export const actualizar = async (req, res) => {
  const { id } = req.params;
  const { campo_texto, campo_numero, campo_fecha } = req.body;

  try {
    const [resultado] = await db.query(
      'UPDATE tabla SET campo_texto = ?, campo_numero = ?, campo_fecha = ? WHERE id = ?',
      [campo_texto, campo_numero, campo_fecha, id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: 'No encontrado.' });
    }
    res.json({ ok: true, mensaje: 'Actualizado correctamente.' });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error al actualizar.' });
  }
};

// "ELIMINAR" (inactivar — mismo mecanismo que actualizar, con un solo campo)
export const inactivar = async (req, res) => {
  const { id } = req.params;
  try {
    const [resultado] = await db.query('UPDATE tabla SET estado = 0 WHERE id = ?', [id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: 'No encontrado.' });
    }
    res.json({ ok: true, mensaje: 'Inactivado correctamente.' });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error al inactivar.' });
  }
};