// src/modules/user/pages/UserDetailPage.jsx
import { useParams, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { UserForm } from '@/modules/user/components/UserForm';
import { ApprenticeDetailForm } from '@/modules/user/components/ApprenticeDetailForm';
import { actualizarEstadoUsuario, getUsuarioPorId } from '@/modules/user/services/userService';
import { useAuth } from '@/modules/auth/context/AuthContext';

// Vista de consulta para información personal, cuenta y detalle de aprendiz.
export const UserDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const backPath = location.pathname.split('/').slice(0, -1).join('/') || '/usuarios';
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const { hasRole } = useAuth();

  useEffect(() => {
    const fetchDetalle = async () => {
      try {
        const usuarioDB = await getUsuarioPorId(id);
        setDatos({
          usuario: usuarioDB,
          aprendiz: usuarioDB.detalle_aprendiz || null
        });
      } catch (error) {
        console.error("Error al cargar el perfil:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetalle();
  }, [id]);

  if (loading) return <div className="container mt-5 text-center">Consultando expedientes...</div>;
  if (!datos) return <div className="container mt-5">Registro no encontrado.</div>;
  const canChangeState = hasRole(['ADMINISTRADOR', 'JEFE_SEGURIDAD']);
  const section = backPath.split('/')[1];
  const canChangeTargetState = canChangeState && (
    section === 'usuarios' ? false :
    section === 'jefes-seguridad' ? hasRole(['ADMINISTRADOR']) :
      section === 'celadores' ? hasRole(['JEFE_SEGURIDAD']) :
        ['aprendices', 'invitados'].includes(section) ? hasRole(['ADMINISTRADOR']) :
          hasRole(['ADMINISTRADOR', 'JEFE_SEGURIDAD'])
  );
  const changeState = async () => {
    try {
      const estado = datos.usuario.estado ? 0 : 1;
      await actualizarEstadoUsuario(datos.usuario.id, estado);
      setDatos((current) => ({ ...current, usuario: { ...current.usuario, estado } }));
      setMessage(estado ? 'Usuario habilitado.' : 'Usuario deshabilitado.');
    } catch (error) { setMessage(error.message); }
  };

  return (
    <div className="container my-5 animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
        <h2 className="fw-bold text-dark m-0">
          <i className="bi bi-file-earmark-person me-2"></i>Perfil #{datos.usuario.numero_documento}
        </h2>
        <Link to={backPath} className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-2"></i>Volver a la lista
        </Link>
        {canChangeTargetState && <button className={`btn ${datos.usuario.estado ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={changeState}>{datos.usuario.estado ? 'Deshabilitar' : 'Habilitar'}</button>}
      </div>
      {message && <div className="alert alert-info">{message}</div>}

      <div className="row g-4">
        <div className="col-xl-6">
          <h4 className="text-secss mb-3"><i className="bi bi-person-badge"></i> Perfil de Usuario</h4>
          <UserForm initialData={datos.usuario} mode="consulta" readOnly={true} />
        </div>

        {datos.aprendiz && (
          <div className="col-xl-6">
            <h4 className="text-success mb-3"><i className="bi bi-mortarboard"></i> Información Académica</h4>
            <ApprenticeDetailForm initialData={datos.aprendiz} mode="consulta" readOnly={true} />
          </div>
        )}
      </div>
      
    </div>
  );
};