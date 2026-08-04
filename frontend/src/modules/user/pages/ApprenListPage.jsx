// src/modules/users/pages/ApprenListPage.jsx
import { useState, useEffect } from 'react';
import { MasterTableList } from '@/components/layout/MasterTableList';
import { Link } from 'react-router-dom';

export const ApprenListPage = () => {
  // 1. Estado para almacenar los datos que vendrán de la API
  const [aprendices, setAprendices] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. Fetch para obtener datos del JSON Server
  useEffect(() => {
    const fetchAprendices = async () => {
      try {
        const response = await fetch('http://localhost:3000/usuarios');
        const data = await response.json();
        
        // Filtramos para asegurar que solo cargue aprendices
        const filtrados = data.filter(u => u.roles && u.roles.includes('APRENDIZ'));
        setAprendices(filtrados);
      } catch (error) {
        console.error("Error al conectar con la base de datos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAprendices();
  }, []);

  // 3. Mapeo dinámico (Mantiene tu diseño original)
  const vistaDatos = aprendices.map(aprendiz => ({
    "Tipo de documento": aprendiz.tipo_documento,
    "N° de documento": aprendiz.numero_documento,
    "Nombre Completo": aprendiz.nombre_completo,
    "Ficha": <span className="badge bg-success">{aprendiz.detalle_aprendiz?.ficha || 'N/A'}</span>,
    "Fecha de vinculación": aprendiz.fecha_vinculacion,
    "Fecha de terminación": aprendiz.fecha_terminacion,
    "Acciones": (
      <Link to={`/cupos/${aprendiz.id}`} className="btn btn-sm btn-outline-primary">
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
        titulo="Directorio General de Aprendices" 
        icono="bi-people-fill" 
        columnas={['Tipo de documento','N° de documento', 'Nombre Completo', 'Ficha', 'Fecha de vinculación', 'Fecha de terminación', 'Acciones']}
        datos={vistaDatos}
      />
    </div>
  );
};