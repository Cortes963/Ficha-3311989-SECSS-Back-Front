import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/modules/auth/context/AuthContext';
import { ProtectedRoute } from '@/router/ProtectedRoute';
import { LayoutPrincipal } from '@/components/layout/LayoutPrincipal';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { RegisterPage } from '@/modules/auth/pages/RegisterPage';
import { RecoveryPage } from '@/modules/auth/pages/RecoveryPage';
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
import { ProfilePage } from '@/modules/user/pages/ProfilePage';
import { DirectoryPage } from '@/modules/user/pages/DirectoryPage';
import { UserDetailPage } from '@/modules/user/pages/UserDetailPage';
import { StaffRegistrationPage } from '@/modules/user/pages/StaffRegistrationPage';
import { CentersPage } from '@/modules/core/pages/CentersPage';
import { EntriesPage } from '@/modules/input_output/pages/EntriesPage';
import { EntryDetailPage } from '@/modules/input_output/pages/EntryDetailPage';
import { EntryOperationPage } from '@/modules/input_output/pages/EntryOperationPage';
import { AccessQuotaPage } from '@/modules/quota/pages/AccessQuotaPage';
import { QuotaAuthorizationDetailPage } from '@/modules/quota/pages/QuotaAuthorizationDetailPage';
import { MyQuotaSummaryPage } from '@/modules/quota/pages/MyQuotaSummaryPage';
import { PqrsCreatePage } from '@/modules/pqrs/pages/PqrsCreatePage';
import { PqrsLandingPage } from '@/modules/pqrs/pages/PqrsLandingPage';
import { ReportsPage } from '@/modules/pqrs/pages/ReportsPage';
import { ReportCreatePage } from '@/modules/pqrs/pages/ReportCreatePage';
import { ReportDetailPage } from '@/modules/pqrs/pages/ReportDetailPage';
import { PqrsDetailPage } from '@/modules/pqrs/pages/PqrsDetailPage';

const roles = {
  admin: ['ADMINISTRADOR'],
  jefe: ['JEFE_SEGURIDAD'],
  adminJefe: ['ADMINISTRADOR', 'JEFE_SEGURIDAD'],
  staff: ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR'],
  all: ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR', 'APRENDIZ', 'INVITADO'],
  ownEntries: ['INVITADO', 'APRENDIZ', 'CELADOR', 'JEFE_SEGURIDAD'],
  ownQuota: ['ADMINISTRADOR', 'JEFE_SEGURIDAD', 'CELADOR', 'APRENDIZ', 'INVITADO'],
  pqrsOwner: ['JEFE_SEGURIDAD', 'CELADOR', 'APRENDIZ', 'INVITADO'],
  reportRead: ['CELADOR', 'JEFE_SEGURIDAD'],
  reportWrite: ['CELADOR']
};

const guarded = (allowedRoles, path, element) => ({
  path,
  element: <ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>
});

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegisterPage /> },
  { path: '/recuperar', element: <RecoveryPage /> },
  { element: <ProtectedRoute><LayoutPrincipal /></ProtectedRoute>, children: [
    { index: true, element: <DashboardPage /> },
    { path: 'perfil', element: <ProfilePage /> },
    guarded(roles.adminJefe, 'usuarios', <DirectoryPage title="Usuarios" detailPath="/usuarios" canDisable disableRoles={roles.admin} />),
    guarded(roles.adminJefe, 'usuarios/:id', <UserDetailPage />),
    guarded(roles.adminJefe, 'aprendices', <DirectoryPage title="Aprendices" role="APRENDIZ" detailPath="/aprendices" canDisable disableRoles={roles.admin} />),
    guarded(roles.adminJefe, 'aprendices/:id', <UserDetailPage />),
    guarded(roles.admin, 'jefes-seguridad', <DirectoryPage title="Jefes de seguridad" role="JEFE_SEGURIDAD" canDisable disableRoles={roles.admin} detailPath="/jefes-seguridad" createPath="/jefes-seguridad/nuevo" createRoles={roles.admin} />),    guarded(roles.admin, 'jefes-seguridad/:id', <UserDetailPage />),
    guarded(roles.admin, 'jefes-seguridad/nuevo', <StaffRegistrationPage role="JEFE_SEGURIDAD" />),
    guarded(roles.jefe, 'celadores', <DirectoryPage title="Celadores" role="CELADOR" canDisable disableRoles={roles.jefe} detailPath="/celadores" createPath="/celadores/nuevo" createRoles={roles.jefe} />),
    guarded(roles.jefe, 'celadores/:id', <UserDetailPage />),
    guarded(roles.jefe, 'celadores/nuevo', <StaffRegistrationPage role="CELADOR" />),
    guarded(roles.adminJefe, 'invitados', <DirectoryPage title="Invitados" role="INVITADO" detailPath="/invitados" canDisable disableRoles={roles.admin} />),
    guarded(roles.adminJefe, 'invitados/:id', <UserDetailPage />),
    guarded(roles.admin, 'centros', <CentersPage />),
    guarded(roles.ownEntries, 'entradas-salidas', <EntriesPage />),
    guarded(roles.ownEntries, 'entradas-salidas/:id', <EntryDetailPage />),
    { path: 'entradas-salidas/detalle', element: <Navigate to="/entradas-salidas" replace /> },
    guarded(['CELADOR'], 'entradas-salidas/operar', <EntryOperationPage />),
    guarded(roles.all, 'cupos', <AccessQuotaPage />),
    guarded(roles.all, 'cupos/:idUsuario/:idVehiculo', <QuotaAuthorizationDetailPage />),
    { path: 'cupos/detalle', element: <Navigate to="/cupos" replace /> },
    guarded(roles.ownQuota, 'mi-cupo', <MyQuotaSummaryPage />),
    guarded(roles.reportRead, 'reportes', <ReportsPage />),
    guarded(roles.reportWrite, 'reportes/nuevo', <ReportCreatePage />),
    guarded(roles.reportRead, 'reportes/:id', <ReportDetailPage />),
    guarded(roles.all, 'pqrs', <PqrsLandingPage />),
    guarded(roles.all, 'pqrs/:id', <PqrsDetailPage />),
    guarded(roles.pqrsOwner, 'pqrs/nuevo', <PqrsCreatePage />),
  ] },
  { path: '/unauthorized', element: <div className="container py-5"><h1>No tienes permiso para esta sección</h1></div> },
  { path: '*', element: <div className="container py-5"><h1>404 - Recurso no encontrado</h1></div> }
]);

export const AppRouter = () => <AuthProvider><RouterProvider router={router} /></AuthProvider>;
