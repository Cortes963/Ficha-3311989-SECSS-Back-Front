import { useState } from 'react';
import { requestPasswordReset, resetPassword } from '@/modules/auth/services/recoveryService';
import { FormField } from '@/components/ui/FormField';

export const RecoveryPage = () => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  return <div className="container py-5"><div className="card p-4 mx-auto border-0 shadow-sm" style={{ maxWidth: 560 }}><h1 className="h3">Recuperar contraseña</h1><form onSubmit={async (e) => { e.preventDefault(); const result = await requestPasswordReset(email); setMessage(result.mensaje || 'Solicitud enviada.'); if (result.token) setToken(result.token); }}><FormField label="Correo de la cuenta" name="correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /><button className="btn btn-outline-primary">Solicitar recuperación</button></form><hr /><form onSubmit={async (e) => { e.preventDefault(); try { const result = await resetPassword(token, password); setMessage(result.mensaje); } catch (error) { setMessage(error.message); } }}><FormField label="Token" name="token" value={token} onChange={(e) => setToken(e.target.value)} required /><FormField label="Nueva contraseña" name="password" type="password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} required /><button className="btn btn-primary">Restablecer contraseña</button></form>{message && <div className="alert alert-info mt-3 mb-0">{message}</div>}</div></div>;
};
