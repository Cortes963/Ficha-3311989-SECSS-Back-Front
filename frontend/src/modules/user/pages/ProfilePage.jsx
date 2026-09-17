import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { getMiPerfil, updateMyAcademicDetail, updateMyPassword, updateMyProfile, deactivateMyAccount } from '@/modules/user/services/userService';
import { FormField } from '@/components/ui/FormField';
import { UserForm } from '@/modules/user/components/UserForm';
import { ApprenticeDetailForm } from '@/modules/user/components/ApprenticeDetailForm';

export const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [password, setPassword] = useState({ password_actual: '', password_nueva: '' });
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const canEdit = !user?.roles?.includes('INVITADO');
  useEffect(() => { getMiPerfil().then(setProfile).catch((error) => setMessage(error.message)); }, []);
  const changePassword = async (event) => {
    event.preventDefault();
    try { const response = await updateMyPassword(password.password_actual, password.password_nueva); setMessage(response.mensaje); setPassword({ password_actual: '', password_nueva: '' }); } catch (error) { setMessage(error.message); }
  };
  const saveProfile = async (payload) => {
    try { const response = await updateMyProfile(payload); setMessage(response.mensaje); setEditing(false); setProfile(await getMiPerfil()); } catch (error) { setMessage(error.message); }
  };
  const saveAcademic = async (payload) => {
    try { const response = await updateMyAcademicDetail(payload); setMessage(response.mensaje); setProfile(await getMiPerfil()); } catch (error) { setMessage(error.message); }
  };
  const deactivate = async () => {
    try { const response = await deactivateMyAccount(); logout(); navigate('/login', { replace: true, state: { message: response.mensaje } }); } catch (error) { setMessage(error.message); }
  };
  if (!profile) return <div className="alert alert-info">{message || 'Cargando información...'}</div>;
  return <><div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h4 mb-0">Mi información y cuenta</h2><button className="btn btn-outline-secondary" onClick={() => navigate('/')}>Volver</button></div><div className="row g-4"><section className="col-lg-7"><div className="d-flex justify-content-between align-items-center mb-2"><h3 className="h5 mb-0">Usuario y cuenta</h3>{canEdit && <button className="btn btn-outline-primary" onClick={() => setEditing((value) => !value)}>{editing ? 'Cancelar' : 'Editar'}</button>}</div><UserForm initialData={profile} mode={editing ? 'edicion' : 'consulta'} readOnly={!editing || !canEdit} onSubmit={saveProfile} />{profile.detalle_aprendiz && <><h3 className="h5">Detalle académico</h3><ApprenticeDetailForm initialData={profile.detalle_aprendiz} readOnly={!editing || !canEdit} onSubmit={saveAcademic} /></>}<button className="btn btn-outline-danger" onClick={deactivate}>Desactivar cuenta</button></section><section className="col-lg-5"><form className="card p-4 border-0 shadow-sm" onSubmit={changePassword}><h2 className="h5">Cambiar contraseña</h2><FormField label="Contraseña actual" name="password_actual" type="password" value={password.password_actual} onChange={(e) => setPassword({ ...password, password_actual: e.target.value })} required /><FormField label="Nueva contraseña" name="password_nueva" type="password" minLength={10} value={password.password_nueva} onChange={(e) => setPassword({ ...password, password_nueva: e.target.value })} required /><button className="btn btn-primary">Actualizar</button>{message && <p className="small mt-3 mb-0">{message}</p>}</form></section></div></>;
};
