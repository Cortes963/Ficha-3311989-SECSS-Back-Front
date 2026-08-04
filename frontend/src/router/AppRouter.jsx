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
          // Index / Dashboard principal
          { index: true, element: <DashboardPage /> },
          
          // Información General y Operación de Tránsito
          { path: "noticias", element: <NewsPage /> },
          { path: "pico-placa", element: <PickPlatePage /> },
          
          // Submódulo de Bitácora / Minuta Operativa
          { path: "bitacora/diaria", element: <LogbookDailyPage /> }, // Control de flujo en tiempo real

          // Submódulo de Gestión de Usuarios (Foco Administrativo)
          { path: "aprendices", element: <ApprenListPage /> },
          { path: "celadores", element: <SecureListPage /> },
          { path: "celadores/:id", element: <UserDetailPage /> },

          // Submódulo de Gestión de Cupos Vehiculares (Polimórfico)
          { path: "cupos", element: <QuotaListPage /> }, 
          { path: "cupos/:id", element: <QuotaDetailPage /> }, // Gestión administrativa y de control de accesos
          
          // Ruta de Autoservicio Segura
          { path: "mi-cupo", element: <MyQuotaPage /> } // El ID se infiere del token en AuthContext, no de la URL
        ]
      }
    ]
  },
  // Fallback para manejo de errores 404 (Opcional, se recomienda implementar un NoFoundPage)
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