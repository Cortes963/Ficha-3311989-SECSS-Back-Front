// src/components/ui/MasterTableList.jsx

export const MasterTableList = ({ titulo, icono, columnas, datos }) => {
  return (
    <div className="card border-0 shadow-sm mb-4">
      
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
        <h5 className="m-0 fw-bold text-dark">
          <i className={`bi ${icono} text-primary me-2`}></i> 
          {titulo}
        </h5>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-secondary"><i className="bi bi-filter"></i> Filtrar</button>
          <button className="btn btn-sm btn-primary"><i className="bi bi-arrow-clockwise"></i> Actualizar</button>
        </div>
      </div>

      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                {columnas.map((col, idx) => (
                  <th key={idx} className={idx === 0 ? "ps-4" : ""}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.length > 0 ? (
                datos.map((fila, filaIdx) => (
                  <tr key={filaIdx}>
                    {/* Usamos Object.entries para inspeccionar tanto la clave como el valor */}
                    {Object.entries(fila).map(([clave, valor], valIdx) => {
          
                      // FILTRO CRÍTICO DE SEGURIDAD INDUSTRIAL:
                      // Si el campo es de credenciales, lo omitimos del renderizado de la lista
                      if (clave.toLowerCase() === 'password' || clave.toLowerCase() === 'contrasena') {
                        return null; 
                      }

                      return (
            <td key={valIdx} className={valIdx === 0 ? "ps-4" : ""}>
              {valor}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
    <tr>
      <td colSpan={columnas.length} className="text-center py-4 text-muted">
        No hay registros disponibles.
      </td>
    </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};