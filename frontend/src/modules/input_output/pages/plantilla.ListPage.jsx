// src/modules/<modulo>/pages/NOMBRELISTPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterTableList } from '@/components/layout/MasterTableList';
import { listarNOMBRE } from '@/modules/<modulo>/services/NOMBREService';

export const NOMBRELISTPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await listarNOMBRE(); // pide al service, nunca fetch() directo aquí
        setItems(data);
      } catch (error) {
        console.error("Error al cargar:", error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  // OBLIGATORIO: las claves de este objeto deben ser IGUALES a las de `columnas`
  const datos = items.map(item => ({
    "Columna 1": item.campo_uno,
    "Columna 2": item.campo_dos,
    "Acciones": (
      <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/ruta/${item.id}`)}>
        Ver detalle
      </button>
    )
  }));

  if (loading) return <div className="container mt-4 text-center">Cargando...</div>;

  return (
    <div className="container mt-4">
      <MasterTableList
        titulo="Título de la lista"
        icono="bi-list-ul"
        columnas={['Columna 1', 'Columna 2', 'Acciones']}
        datos={datos}
      />
    </div>
  );
};