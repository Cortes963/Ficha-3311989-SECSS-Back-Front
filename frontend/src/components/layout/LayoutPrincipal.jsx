import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/context/AuthContext';

export const LayoutPrincipal = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <>
      <header className="header-secss">
        <div className="container py-3">

          <div className="row align-items-center">

            <div className="col-md-6 d-flex align-items-center gap-3">

              <span className="badge-sena">
                SENA
              </span>

              <div>
                <h4 className="mb-0 text-white">
                  SECSS
                </h4>

                <small>
                  Sistema de Gestión y Control Tecnológico | CEET
                </small>
              </div>

            </div>

            <div className="col-md-6 text-md-end mt-3 mt-md-0">

              <span>
                Centro de Electricidad, Electrónica y Telecomunicaciones
              </span>

            </div>

          </div>

        </div>
      </header>

      <nav className="navbar navbar-expand-lg navbar-dark">
        <div className="container">

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#menuPrincipal"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div
            className="collapse navbar-collapse"
            id="menuPrincipal"
          >

            <ul className="navbar-nav me-auto">

              <li className="nav-item">
                <a className="nav-link" href="/">
                  <i className="bi bi-house-door-fill me-1"></i>
                  Inicio
                </a>
              </li>

              <li className="nav-item">
                <a className="nav-link" href="/novedades">
                  <i className="bi bi-shield-check me-1"></i>
                  Noticias
                </a>
              </li>

              <li className="nav-item">
                <a className="nav-link" href="/pico-placa">
                  <i className="bi bi-card-list me-1"></i>
                  Pico y Placa
                </a>
              </li>

              <li className="nav-item">
                <a
                  className="nav-link active"
                  href="/consulta-cupos"
                >
                  <i className="bi bi-pie-chart-fill me-1"></i>
                  Control de Cupos
                </a>
              </li>

            </ul>

            <div className="d-flex gap-2">

              <button className="btn btn-outline-light btn-sm">
                <i className="bi bi-person-badge me-1"></i>
                Vista Global
              </button>
              <button className="btn btn-outline-light btn-sm" onClick={() => { logout(); navigate('/login'); }}>Cerrar sesión</button>
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

