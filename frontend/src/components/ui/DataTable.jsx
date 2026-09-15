import { useMemo, useState } from 'react';

export const DataTable = ({ title, columns, rows, searchable = true, loading = false, empty = 'No hay registros para mostrar.', actions }) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return rows;
    return rows.filter((row) => Object.values(row).some((cell) => String(cell ?? '').toLowerCase().includes(value)));
  }, [query, rows]);
  return <section className="card border-0 shadow-sm">
    <div className="card-header bg-white d-flex flex-wrap gap-3 justify-content-between align-items-center">
      <h2 className="h5 mb-0">{title}</h2>
      {actions}
    </div>
    {searchable && <div className="p-3 border-bottom"><input className="form-control" placeholder="Buscar..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>}
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>{loading ? <tr><td colSpan={columns.length} className="text-center py-5">Cargando...</td></tr> : filtered.length ? filtered.map((row, index) => <tr key={row.id ?? index}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? '—'}</td>)}</tr>) : <tr><td colSpan={columns.length} className="text-center text-muted py-5">{empty}</td></tr>}</tbody>
      </table>
    </div>
  </section>;
};
