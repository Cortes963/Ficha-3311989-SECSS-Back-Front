import { useAuth } from '@/modules/auth/context/AuthContext';
import { PqrsAdminPage } from './PqrsAdminPage';
import { PqrsMyPage } from './PqrsMyPage';
import { Link } from 'react-router-dom';

export const PqrsLandingPage = () => {
  const { hasRole } = useAuth();
  return hasRole(['ADMINISTRADOR']) ? <PqrsAdminPage /> : <><div className="d-flex justify-content-end mb-3"><Link className="btn btn-primary" to="/pqrs/nuevo">Registrar PQRS</Link></div><PqrsMyPage /></>;
};
