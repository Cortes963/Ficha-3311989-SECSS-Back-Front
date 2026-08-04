// src/modules/quota/pages/QuotaListPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterTableList } from '@/components/layout/MasterTableList';

export const QuotaListPage = () => {
  const [busqueda, setBusqueda] = useState('');
  const [cuposData, setCuposData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // CONEXIÓN A JSON-SERVER
  useEffect(() => {
    const fetchCupos = async () => {
      try {
        const [resVehiculos, resUsuarios] = await Promise.all([
          fetch('http://localhost:3000/vehiculos'),
          fetch('http://localhost:3000/usuarios')
        ]);
        
        const vehiculosDB = await resVehiculos.json();
        const usuariosDB = await resUsuarios.json();

        // MAPEADO TOLERANTE A ERRORES DE ESTRUCTURA
        const datosCruzados = vehiculosDB.map(vehiculo => {
          const propietario = usuariosDB.find(u => String(u.id) === String(vehiculo.propietario_id)) || {};
          
          // Extraemos la identificación del vehículo (Placa para moto, Marco para bicicleta)
          // Se accede de forma segura usando Optional Chaining (?.)
          const identificadorVehiculo = vehiculo.detalle?.placa || vehiculo.detalle?.numero_marco || 'SIN REGISTRO';

          return {
            usuarioId: propietario.id || null, 
            documento: propietario.numero_documento ? String(propietario.numero_documento) : 'Sin doc',
            nombre: propietario.nombre_completo ? String(propietario.nombre_completo) : 'Usuario No Encontrado',
            tipoVehiculo: vehiculo.tipo_vehiculo || 'No definido',
            placa: String(identificadorVehiculo), // Forzamos siempre a String primitivo
            estado: vehiculo.estado_cupo || 'Inactivo'
          };
        });

        setCuposData(datosCruzados);
      } catch (error) {
        console.error("Error en la sincronización de cupos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCupos();
  }, []);

  // FILTRADO ULTRA-SEGURO (Previene fallos de tipo Undefined / Number / Null)
  const cuposFiltrados = cuposData.filter(c => {
    const busquedaClean = busqueda.toLowerCase().trim();
    if (!busquedaClean) return true;

    // Aseguramos la existencia de strings válidos antes de aplicar toLowerCase
    const nombreClean = c.nombre.toLowerCase();
    const placaClean = c.placa.toLowerCase();
    const docClean = c.documento.toLowerCase();

    return (
      nombreClean.includes(busquedaClean) ||
      placaClean.includes(busquedaClean) ||
      docClean.includes(busquedaClean)
    );
  });

  // CONFIGURACIÓN DE COLUMNAS
  const columnas = [
    { key: "documento", label: "Documento" },
    { key: "nombre", label: "Propietario" },
    { key: "tipoVehiculo", label: "Tipo" },
    { key: "placa", label: "Placa / Serial" },
    { key: "estado", label: "Estado Cupo" },
    { key: "Acciones", label: "Acciones" }
  ];

  // FORMATEO DE FILAS PARA RENDERIZAR EN MASTER-TABLE
  const filas = cuposFiltrados.map(c => ({
    "documento": c.documento,
    "nombre": c.nombre,
    "tipoVehiculo": (
      <span className="badge bg-light text-dark border">
        {c.tipoVehiculo.toUpperCase() === 'MOTO' ? '🏍️ Moto' : '🚲 Bicicleta'}
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
        onClick={() => {
          if (c.usuarioId) {
            navigate(`/cupos/${c.usuarioId}`);
          } else {
            alert("No se puede abrir el expediente: Vehículo huérfano de propietario.");
          }
        }} 
        className="btn btn-sm btn-outline-info shadow-sm"
        disabled={!c.usuarioId}
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