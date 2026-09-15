import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/context/AuthContext';

export const LayoutPrincipal = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-vh-100 bg-light">
      <header className="navbar navbar-dark bg-dark">
        <div className="container">
          <NavLink className="navbar-brand fw-bold" to="/">SECSS</NavLink>
          <div className="d-flex align-items-center gap-3 text-white">
            <NavLink className="link-light text-decoration-none" to="/perfil">{user?.nombre}</NavLink>
            <button className="btn btn-outline-light btn-sm" onClick={() => { logout(); navigate('/login'); }}>Cerrar sesión</button>
          </div>
        </div>
      </header>
      <main className="container py-4"><Outlet /></main>
    </div>
  );
};
