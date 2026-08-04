// src/modules/dashboard/pages/DashboardPage.jsx
import { useAuth } from '@/modules/auth/context/AuthContext';
import { roleCardsData } from '@/components/layout/menuOptions';
import { Link } from 'react-router-dom';

export const DashboardPage = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <>
      {/* Banner Original HTML */}
      <section className="welcome-banner p-4 rounded shadow-sm mb-5 text-white">
            <div className="row align-items-center">
                <div className="col-md-8">
                    <h2 className="display-6 font-weight-bold">Bienvenido al Sistema SECSS</h2>
                    <p className="lead mb-0">Plataforma de Servicio de Estacionamiento del Complejo Sur SENA.</p>
                </div>
                <div className="col-md-4 text-md-end text-center mt-3 mt-md-0">
                    <span className="badge bg-white text-dark p-2"><i className="bi bi-calendar3"></i> Entorno de Pruebas v1.0</span>
                </div>
            </div>
      </section>
      {/* Tarjetas Dinámicas Originales */}
      <h3 class="mb-4 text-secss border-bottom pb-2"><i class="bi bi-layers-half"></i>Rol</h3>
      <div className="row g-4">
        {user.roles?.map((rolKey) => {
          const cardInfo = roleCardsData[rolKey];
          if (!cardInfo) return null;

          return (
            <div className="col-md-6 col-lg-3" key={rolKey}>
              <div className={`card role-card h-100 ${cardInfo.borderClass} border-0 shadow-sm`}>
                
                {/* Cabecera idéntica al diseño original */}
                <div className={`card-header text-white ${cardInfo.headerClass} card-header-role d-flex align-items-center gap-3 p-3 border-0`}>
                  <i className={`${cardInfo.icon} fs-4`}></i>
                  <span className="fw-bold fs-6">{cardInfo.title}</span>
                </div>
                
                {/* Cuerpo interactivo: El <Link> actúa directamente como el item de la lista */}
                <div className="list-group list-group-flush">
                  {cardInfo.actions.map((action, idx) => (
                    <Link 
                      key={idx}
                      to={action.path} 
                      className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3"
                    >
                      <i className={`${action.icon} text-success fs-5`}></i> 
                      <span className="fw-medium text-secondary">{action.label}</span>
                    </Link>
                  ))}
                </div>
                
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};