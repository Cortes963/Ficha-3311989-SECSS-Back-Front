/** **ADMINISTRADOR** → `PqrsAdminList` (gestion completa).
- **Cualquier otro rol** → `ReportForm` (crear) + `MisPqrsList` (las suyas).
 */


import { useAuth } from '@/modules/auth/context/AuthContext';
import { ReportForm } from '@/modules/pqrs/components/ReportForm';
import { PqrsAdminList } from '@/modules/pqrs/components/PqrsAdminList';
import { MisPqrsList } from '@/modules/pqrs/components/MisPqrsList';

/**
 * Pagina de entrada del modulo PQRS (ruta /pqrs).
 * - ADMINISTRADOR: ve la gestion de todas las PQRS y puede responderlas.
 * - Cualquier otro rol (aprendiz, celador, jefe de seguridad, invitado):
 *   ve el formulario para radicar una PQRS y el listado de las suyas,
 *   con el estado y la respuesta cuando ya exista.
 */
export const PqrsPage = () => {
  const { hasRole } = useAuth();
  const esAdministrador = hasRole(['ADMINISTRADOR']);

  if (esAdministrador) {
    return (
      <div className="container-fluid py-2">
        <PqrsAdminList />
      </div>
    );
  }

  return (
    <div className="container-fluid py-2">
      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <ReportForm />
        </div>
        <div className="col-12 col-lg-7">
          <MisPqrsList />
        </div>
      </div>
    </div>
  );
};
