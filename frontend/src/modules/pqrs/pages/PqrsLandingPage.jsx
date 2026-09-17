import { useAuth } from '@/modules/auth/context/AuthContext';
import { PqrsAdminPage } from './PqrsAdminPage';
import { PqrsMyPage } from './PqrsMyPage';
import { Link } from 'react-router-dom';

export const PqrsLandingPage = () => {
  const { hasRole } = useAuth();
  return <><div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h4 mb-0">PQRS</h2><div className="d-flex gap-2"><Link className="btn btn-outline-secondary" to="/">Volver</Link>{!hasRole(['ADMINISTRADOR']) && <Link className="btn btn-primary" to="/pqrs/nuevo">Registrar PQRS</Link>}</div></div>{hasRole(['ADMINISTRADOR']) ? <PqrsAdminPage /> : <PqrsMyPage />}</>;
};
