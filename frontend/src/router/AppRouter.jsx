// src/router/AppRouter.jsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/modules/auth/context/AuthContext';
import { ProtectedRoute } from '@/router/ProtectedRoute';
import { LayoutPrincipal } from '@/components/layout/LayoutPrincipal';

// Módulo de Autenticación
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { RegisterPage } from '@/modules/auth/pages/RegisterPage';

// Módulo Core / Dashboard
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
import { NewsPage } from '@/modules/core/pages/NewsPage';
import { PickPlatePage } from '@/modules/core/pages/PickPlatePage';

// Módulo de Control Operativo (Entradas / Salidas / Minuta)
import { LogbookDailyPage } from '@/modules/input_output/pages/LogbookDailyPage'; // 🌟 Nueva vista diaria para Celadores

// Módulo de Usuarios y Aprendices
import { ApprenListPage } from '@/modules/user/pages/ApprenListPage';
import { SecureListPage } from '@/modules/user/pages/SecureListPage';
import { UserDetailPage } from '@/modules/user/pages/UserDetailPage';

// Módulo de Cupos Vehiculares
import { QuotaListPage } from '@/modules/quota/pages/QuotaListPage';
import { QuotaDetailPage } from '@/modules/quota/pages/QuotaDetailPage'; // 🌟 Solo para Admin / Celador
import { MyQuotaPage } from '@/modules/quota/pages/MyQuotaPage'; // 🌟 Autoservicio para Aprendices / Invitados

// Nombres de rol confirmados por el DML real (INSERT INTO rol...): ADMINISTRADOR,
// JEFE_SEGURIDAD, CELADOR, APRENDIZ, INVITADO — reemplaza el supuesto anterior
// (aprendiz/celador/administrador en minúscula, sin JEFE_SEGURIDAD ni INVITADO).

const router = createBrowserRouter([
  // Rutas Públicas / Fuera de Sesión
  { 
    path: "/login", 
    element: <LoginPage /> 
  },
  { 
    path: "/registro", // Corrección: kebab-case estandarizado
    element: <RegisterPage /> 
  },
  
  // Rutas Protegidas / Requieren Autenticación
  {
    element: <ProtectedRoute />, 
    children: [
      {
        path: "/",
        element: <LayoutPrincipal />, 
        children: [
          // Index / Dashboard principal — cualquier rol autenticado
          { index: true, element: <DashboardPage /> },

          // Información General y Operación de Tránsito — cualquier rol autenticado
          { path: "noticias", element: <NewsPage /> },
          { path: "pico-placa", element: <PickPlatePage /> },

          // Control operativo diario: quien registra entradas/salidas y ve cupos
          {
            element: <ProtectedRoute allowedRoles={["CELADOR", "JEFE_SEGURIDAD", "ADMINISTRADOR"]} />,
            children: [
              { path: "bitacora/diaria", element: <LogbookDailyPage /> },
              { path: "cupos", element: <QuotaListPage /> },
              { path: "cupos/:id", element: <QuotaDetailPage /> },
            ]
          },

          // Gestión de aprendices: foco administrativo
          {
            element: <ProtectedRoute allowedRoles={["ADMINISTRADOR"]} />,
            children: [
              { path: "aprendices", element: <ApprenListPage /> },
            ]
          },

          // Gestión de celadores: administrativo + su propio jefe de seguridad
          // (tabla jefe_seguridad_celador sugiere que JEFE_SEGURIDAD administra celadores)
          {
            element: <ProtectedRoute allowedRoles={["ADMINISTRADOR", "JEFE_SEGURIDAD"]} />,
            children: [
              { path: "celadores", element: <SecureListPage /> },
              { path: "celadores/:id", element: <UserDetailPage /> },
            ]
          },

          // Autoservicio: aprendices e invitados gestionan su propio cupo
          // (el DML muestra usuarios INVITADO con vehículo propio en auth_vehiculo)
          {
            element: <ProtectedRoute allowedRoles={["APRENDIZ", "INVITADO"]} />,
            children: [
              { path: "mi-cupo", element: <MyQuotaPage /> } // El ID se infiere del usuario en sesión, no de la URL
            ]
          }
        ]
      }
    ]
  },
  {
    path: "/unauthorized",
    element: <div className="p-5 text-center"><h3>No tienes permiso para ver esta sección</h3></div>
  },
  // Fallback para manejo de errores 404
  {
    path: "*",
    element: <div className="p-5 text-center"><h3>404 - Recurso No Encontrado</h3></div>
  }
]);

export const AppRouter = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};
