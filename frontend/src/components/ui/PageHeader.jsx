import { Link } from 'react-router-dom';

export const PageHeader = ({ title, backTo = '/', actions = null }) => (
  <div className="d-flex justify-content-between align-items-center mb-3">
    <h2 className="h4 mb-0">{title}</h2>
    <div className="d-flex gap-2">
      <Link className="btn btn-outline-secondary" to={backTo}>
        <i className="bi bi-arrow-left me-1"></i>Volver
      </Link>
      {actions}
    </div>
  </div>
);
