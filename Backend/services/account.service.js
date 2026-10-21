import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

export function temporaryPassword() {
  return `Aa${crypto.randomBytes(8).toString('base64url')}1!`;
}

export async function createAccount(connection, { userId, correo, password, expiraEn = null }) {
  const passwordHash = await bcrypt.hash(password, 12);
  await connection.query(
    'INSERT INTO cuenta (id_usuario,correo,password_hash,estado,expira_en) VALUES (?,?,?,1,?)',
    [userId, correo, passwordHash, expiraEn]
  );
}
