// src/modules/user/pages/SecureListPage.jsx
import { useState, useEffect } from 'react';
import { MasterTableList } from '@/components/layout/MasterTableList';
import { Link } from 'react-router-dom';
import { getUsuarios } from '@/modules/user/services/userService';

export const SecureListPage = () => {
  const [celadores, setCeladores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCeladores = async () => {
      try {
        const data = await getUsuarios('CELADOR');
        setCeladores(data);
      } catch (error) {
        console.error("Error al conectar con el backend:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCeladores();
  }, []);

  const vistaDatos = celadores.map(celador => ({
    "Tipo de documento": celador.tipo_documento,
    "N° de documento": celador.numero_documento,
    "Nombre Completo": `${celador.primer_nombre} ${celador.segundo_nombre || ''} ${celador.primer_apellido} ${celador.segundo_apellido || ''}`.replace(/\s+/g, ' ').trim(),
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
