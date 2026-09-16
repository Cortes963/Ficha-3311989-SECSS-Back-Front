import { useMemo, useState } from 'react';

export const DataTable = ({ title, columns, rows, searchable = true, loading = false, empty = 'No hay registros para mostrar.', actions }) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return rows;
    return rows.filter((row) => Object.values(row).some((cell) => String(cell ?? '').toLowerCase().includes(value)));
  }, [query, rows]);
  return (
  <section className="card border-0 shadow-sm rounded-3 overflow-hidden border-top border-3 border-success">
    <div className="card-header bg-white border-bottom-0 pt-3 px-4 d-flex flex-wrap gap-3 justify-content-between align-items-center">
      <h2 className="h5 mb-0 fw-bold">{title}</h2>
      {actions}
    </div>

    {searchable && (
      <div className="px-4 pb-3">
        <div className="position-relative">
          <i
            className="bi bi-search position-absolute text-secondary"
            style={{ top: '50%', left: '16px', transform: 'translateY(-50%)' }}
          ></i>
          <input
            className="form-control rounded-pill ps-5 bg-light border-1"
            placeholder="Buscar..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
    )}

    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr className="border-bottom">
            {columns.map((column) => (
              <th key={column.key} className="text-secondary fw-semibold py-3 px-4">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-5">
                Cargando...
              </td>
            </tr>
          ) : filtered.length ? (
            filtered.map((row, index) => (
              <tr key={row.id ?? index} className="border-bottom">
                {columns.map((column) => (
                  <td key={column.key} className="py-3 px-4">
                    {column.render ? column.render(row) : row[column.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="text-center text-muted py-5">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
);};