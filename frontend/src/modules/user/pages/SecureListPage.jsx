// src/modules/users/pages/ApprenListPage.jsx
import { useState, useEffect } from 'react';
import { MasterTableList } from '@/components/layout/MasterTableList';
import { Link } from 'react-router-dom';

export const SecureListPage = () => {
  // 1. Estado para almacenar los datos que vendrán de la API
  const [celadores, setCeladores] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. Fetch para obtener datos del JSON Server
  useEffect(() => {
    const fetchCeladores = async () => {
      try {
        const response = await fetch('http://localhost:3000/usuarios');
        const data = await response.json();
        
        // Filtramos para asegurar que solo cargue celadores
        const filtrados = data.filter(u => u.roles && u.roles.includes('CELADOR'));
        setCeladores(filtrados);
      } catch (error) {
        console.error("Error al conectar con la base de datos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCeladores();
  }, []);

  // 3. Mapeo dinámico (Mantiene tu diseño original)
  const vistaDatos = celadores.map(celador => ({
    "Tipo de documento": celador.tipo_documento,
    "N° de documento": celador.numero_documento,
    "Nombre Completo": celador.nombre_completo,
    "Acciones": (
      <Link to={`/celadores/${celador.id}`} className="btn btn-sm btn-outline-primary">
        <i className="bi bi-eye"></i> Ver Perfil Completo
      </Link>
    )
  }));

  if (loading) {
    return <div className="container mt-4 text-center">Cargando Directorio...</div>;
  }

  return (
    <div className="container mt-4 animate__animated animate__fadeIn">
      <MasterTableList 
        titulo="Directorio General de Celadores" 
        icono="bi-people-fill" 
        columnas={['Tipo de documento','N° de documento', 'Nombre Completo', 'Acciones']}
        datos={vistaDatos}
      />
    </div>
  );
};