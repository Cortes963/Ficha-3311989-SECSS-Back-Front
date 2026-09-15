import { useEffect, useState } from 'react';
import { getMiPerfil, updateMyPassword, updateMyProfile, deactivateMyAccount } from '@/modules/user/services/userService';
import { FormField } from '@/components/ui/FormField';
import { UserForm } from '@/modules/user/components/UserForm';

export const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [password, setPassword] = useState({ password_actual: '', password_nueva: '' });
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  useEffect(() => { getMiPerfil().then(setProfile).catch((error) => setMessage(error.message)); }, []);
  const changePassword = async (event) => {
    event.preventDefault();
    try { const response = await updateMyPassword(password.password_actual, password.password_nueva); setMessage(response.mensaje); setPassword({ password_actual: '', password_nueva: '' }); } catch (error) { setMessage(error.message); }
  };
  const saveProfile = async (payload) => {
    try { const response = await updateMyProfile(payload); setMessage(response.mensaje); setEditing(false); setProfile(await getMiPerfil()); } catch (error) { setMessage(error.message); }
  };
  const deactivate = async () => {
    try { const response = await deactivateMyAccount(); setMessage(response.mensaje); } catch (error) { setMessage(error.message); }
  };
  if (!profile) return <div className="alert alert-info">{message || 'Cargando información...'}</div>;
  return <div className="row g-4"><section className="col-lg-7"><div className="d-flex justify-content-between align-items-center mb-2"><h2 className="h4 mb-0">Mi información y cuenta</h2><button className="btn btn-outline-primary" onClick={() => setEditing((value) => !value)}>{editing ? 'Cancelar' : 'Editar'}</button></div><UserForm initialData={profile} mode={editing ? 'edicion' : 'consulta'} readOnly={!editing} onSubmit={saveProfile} /><button className="btn btn-outline-danger" onClick={deactivate}>Desactivar cuenta</button></section><section className="col-lg-5"><form className="card p-4 border-0 shadow-sm" onSubmit={changePassword}><h2 className="h5">Cambiar contraseña</h2><FormField label="Contraseña actual" name="password_actual" type="password" value={password.password_actual} onChange={(e) => setPassword({ ...password, password_actual: e.target.value })} required /><FormField label="Nueva contraseña" name="password_nueva" type="password" minLength={10} value={password.password_nueva} onChange={(e) => setPassword({ ...password, password_nueva: e.target.value })} required /><button className="btn btn-primary">Actualizar</button>{message && <p className="small mt-3 mb-0">{message}</p>}</form></section></div>;
};
