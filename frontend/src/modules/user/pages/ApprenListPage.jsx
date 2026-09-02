// src/modules/user/pages/ApprenListPage.jsx
import { useState, useEffect } from 'react';
import { MasterTableList } from '@/components/layout/MasterTableList';
import { Link } from 'react-router-dom';
import { getUsuarios } from '@/modules/user/services/userService';

export const ApprenListPage = () => {
  const [aprendices, setAprendices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAprendices = async () => {
      try {
        const data = await getUsuarios('APRENDIZ'); // ya viene desempacado
        setAprendices(data);
      } catch (error) {
        console.error("Error al conectar con el backend:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAprendices();
  }, []);

  const vistaDatos = aprendices.map(aprendiz => ({
    "Tipo de documento": aprendiz.tipo_documento,
    "N° de documento": aprendiz.numero_documento,
    "Nombre Completo": `${aprendiz.primer_nombre} ${aprendiz.segundo_nombre || ''} ${aprendiz.primer_apellido} ${aprendiz.segundo_apellido || ''}`.replace(/\s+/g, ' ').trim(),
    "Ficha": <span className="badge bg-success">{aprendiz.ficha || 'N/A'}</span>,
    "Fecha de vinculación": aprendiz.fecha_vinculacion ? aprendiz.fecha_vinculacion.substring(0, 10) : '—',
    "Fecha de terminación": aprendiz.fecha_terminacion ? aprendiz.fecha_terminacion.substring(0, 10) : '—',
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
