// src/components/layout/LayoutPrincipal.jsx
import { useState } from 'react';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';

export const LayoutPrincipal = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* HEADER EXACTO DEL HTML */}
      <header className="header-secss py-3">
        <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center">
            <div className="logo-container d-flex align-items-center gap-3">
                <div className="badge-sena">SENA</div>
                <div>
                    <h1 className="m-0 h4 text-white font-weight-bold">SECSS</h1>
                    <small className="text-light">Sistema de Gestión y Control Tecnológico | CEET</small>
                </div>
            </div>
            <div className="header-meta text-md-end text-center mt-2 mt-md-0 text-white-50">
                <small>Centro de Electricidad, Electrónica y Telecomunicaciones</small>
            </div>
        </div>
    </header>
    <nav className="navbar navbar-expand-lg navbar-dark bg-secss-main sticky-top shadow-sm">
        <div className="container">
            <a className="navbar-brand d-lg-none" href="#">SECSS Portal</a>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#indexNavbar">
                <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="indexNavbar">
                <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                    <li className="nav-item">
                        <NavLink className="nav-link" to="/">
                            <i className="bi bi-house-door-fill"></i> Inicio
                        </NavLink>
                    </li>
                    <li className="nav-item">
                        <NavLink className="nav-link" to="/noticias">
                            <i className="bi bi-shield-check"></i> Noticias
                        </NavLink>
                    </li>
                    <li className="nav-item">
                        <NavLink className="nav-link" to="/pico-placa">
                            <i className="bi bi-journal-text"></i> Pico y Placa
                        </NavLink>
                    </li>
                </ul>
                <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-secss-light btn-sm" type="button" onClick={handleLogout}>Cerrar Sesión</button>
                </div>
            </div>
        </div>
    </nav>

      {/* CONTENIDO CENTRAL */}
      <main className="container my-5 main-content">
        <Outlet />
      </main>

      {/* FOOTER EXACTO DEL HTML */}
      <footer className="footer-secss mt-auto py-4">
        <div className="container">
          <div className="row g-4 text-center text-md-start">
            <div className="col-md-6">
              <h5 className="text-white mb-3">Proyecto SECSS</h5>
              <p className="text-white-50 small mb-0">
                Aplicación web SENA CEET.
              </p>
            </div>
            <div className="col-md-3 text-md-center">
              <h6 className="text-white mb-3">Enlaces Útiles</h6>
              <ul className="list-unstyled footer-links">
                <li><a href="#" className="text-decoration-none text-white-50">SENA Sofía Plus</a></li>
              </ul>
            </div>
            <div className="col-md-3 text-md-end">
              <h6 className="text-white mb-3">Información</h6>
              <p className="text-white-50 small mb-1">© 2026 SECSS App</p>
              <p className="text-white-50 small">Bogotá, Colombia</p>
            </div>
          </div>
          <hr className="border-secondary my-3" />
          <div className="text-center text-white-50 small">
            <p className="mb-0">Diseñado con fines académicos - Programa de Formación de Aprendices SENA</p>
          </div>
        </div>
      </footer>
    </>
  );
};