import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

export function temporaryPassword() {
  return crypto.randomBytes(9).toString('base64url');
}

// MySQL (modo estricto) rechaza fechas ISO con 'T'/'Z' en columnas DATETIME.
// Las fechas ya compatibles ('2026-12-31' o '2026-12-31 10:00:00') se dejan igual;
// el resto se convierte a Date, que mysql2 serializa en un formato válido.
function toDatetime(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date;
}

export async function createAccount(connection, { userId, correo, password, expiraEn = null }) {
  const passwordHash = await bcrypt.hash(password, 12);
  await connection.query(
    'INSERT INTO cuenta (id_usuario,correo,password_hash,estado,expira_en) VALUES (?,?,?,1,?)',
    [userId, correo, passwordHash, toDatetime(expiraEn)]
  );
}