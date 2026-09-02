import React from 'react';
import ReactDOM from 'react-dom/client';
// IMPORTANTE: Importa tu nuevo AppRouter
import { AppRouter } from './router/AppRouter';
// Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Renderiza tu enrutador en lugar del App viejo */}
    <AppRouter />
  </React.StrictMode>
);