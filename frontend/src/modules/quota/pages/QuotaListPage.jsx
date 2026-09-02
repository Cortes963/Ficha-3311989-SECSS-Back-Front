// src/modules/quota/pages/QuotaListPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterTableList } from '@/components/layout/MasterTableList';
import { listarCupos } from '@/modules/quota/services/Quotaservices';

export const QuotaListPage = () => {
  const [busqueda, setBusqueda] = useState('');
  const [cuposData, setCuposData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCupos = async () => {
      try {
        const filas = await listarCupos(); // ya viene desempacado (.data)
        setCuposData(filas.map(fila => ({
          usuarioId: fila.id_usuario,
          documento: fila.numero_documento,
          nombre: `${fila.primer_nombre} ${fila.primer_apellido}`,
          tipoVehiculo: fila.tipo_vehiculo,
          placa: fila.placa || fila.numero_marco || 'SIN REGISTRO',
          estado: fila.estado === 1 ? 'Activo' : 'Inactivo'
        })));
      } catch (error) {
        console.error("Error en la sincronización de cupos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCupos();
  }, []);

  const cuposFiltrados = cuposData.filter(c => {
    const busquedaClean = busqueda.toLowerCase().trim();
    if (!busquedaClean) return true;
    return (
      c.nombre.toLowerCase().includes(busquedaClean) ||
      c.placa.toLowerCase().includes(busquedaClean) ||
      c.documento.toLowerCase().includes(busquedaClean)
    );
  });

  const columnas = [
    { key: "documento", label: "Documento" },
    { key: "nombre", label: "Propietario" },
    { key: "tipoVehiculo", label: "Tipo" },
    { key: "placa", label: "Placa / Serial" },
    { key: "estado", label: "Estado Cupo" },
    { key: "Acciones", label: "Acciones" }
  ];

  const filas = cuposFiltrados.map(c => ({
    "documento": c.documento,
    "nombre": c.nombre,
    "tipoVehiculo": (
      <span className="badge bg-light text-dark border">
        {c.tipoVehiculo === 'MOTO' ? '🏍️ Moto' : '🚲 Bicicleta'}
      </span>
    ),
    "placa": <strong className="text-primary">{c.placa}</strong>,
    "estado": (
      <span className={`badge ${c.estado === 'Activo' ? 'bg-success' : 'bg-danger'}`}>
        {c.estado}
      </span>
    ),
    "Acciones": (
      <button 
        onClick={() => navigate(`/cupos/${c.usuarioId}`)} 
        className="btn btn-sm btn-outline-info shadow-sm"
      >
        <i className="bi bi-search me-1"></i> Abrir Expediente
      </button>
    )
  }));

  return (
    <div className="container mt-4 animate__animated animate__fadeIn">
      <div className="mb-4">
        <h2 className="fw-bold text-dark m-0">Directorio de Cupos Asignados</h2>
        <p className="text-muted">Módulo de control de acceso e inspección de vehículos</p>
      </div>

      <div className="card p-3 mb-4 shadow-sm border-0 bg-light">
        <div className="input-group input-group-lg">
          <span className="input-group-text bg-white text-primary border-end-0">
            <i className="bi bi-search"></i>
          </span>
          <input 
            type="text" 
            className="form-control border-start-0 ps-0" 
            placeholder="Buscar por placa, número de documento o nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center my-5 py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-muted fw-bold">Sincronizando con la base de datos...</p>
        </div>
      ) : (
        <MasterTableList headers={columnas} rows={filas} />
      )}
    </div>
  );
};
