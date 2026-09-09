// src/modules/input_output/pages/LogbookDailyPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterTableList } from '@/components/layout/MasterTableList';

export const LogbookDailyPage = () => {
  const [registros, setRegistros] = useState([]);
  const [documentoBusqueda, setDocumentoBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1. Cargar bitácora desde la base de datos real
  useEffect(() => {
    const fetchBitacora = async () => {
      try {
        const response = await fetch('http://localhost:3000/bitacora_accesos');
        const data = await response.json();
        setRegistros(data);
      } catch (error) {
        console.error("Error al obtener bitácora:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBitacora();
  }, []);

  // 2. BUSQUEDA CORREGIDA: Primero busca el usuario por documento para obtener su ID real
  const handleBuscarCupo = async (e) => {
    e.preventDefault();
    if (!documentoBusqueda.trim()) return;

    try {
      // Búsqueda por documento en la tabla usuarios
      const res = await fetch(`http://localhost:3000/usuarios?numero_documento=${documentoBusqueda.trim()}`);
      const usuarios = await res.json();

      if (usuarios.length > 0) {
        // Redirigimos usando el ID real obtenido de la base de datos
        navigate(`/cupos/${usuarios[0].id}`);
      } else {
        alert("Usuario no encontrado con ese número de documento.");
      }
    } catch (error) {
      console.error("Error al buscar usuario:", error);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Bitácora de Entradas y Salidas</h2>

      {/* Buscador de documentos corregido */}
      <div className="card p-4 my-4 shadow-sm">
        <form onSubmit={handleBuscarCupo} className="d-flex gap-2">
          <input 
            type="text" 
            className="form-control" 
            placeholder="Digite número de documento..."
            value={documentoBusqueda}
            onChange={(e) => setDocumentoBusqueda(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Buscar Cupo</button>
        </form>
      </div>

      {loading ? <p>Cargando registros...</p> : (
        <MasterTableList 
          columnas={["ID", "Fecha", "Asunto", "Estado"]} 
          datos={registros.map(r => ({
            "ID": r.id,
            "Fecha": r.fecha_hora,
            "Asunto": r.asunto,
            "Estado": r.estado
          }))} 
        />
      )}
    </div>
  );
};