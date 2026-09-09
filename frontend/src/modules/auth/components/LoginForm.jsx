export const LoginForm = ({ onSubmit, credentials, onChange }) => (
  <form onSubmit={onSubmit} className="card p-4">
    <h3>Iniciar Sesión</h3>
    <input name="username" value={credentials.username} onChange={onChange} placeholder="Usuario" className="form-control mb-2" />
    <input name="password" type="password" value={credentials.password} onChange={onChange} placeholder="Contraseña" className="form-control mb-2" />
    <button type="submit" className="btn btn-primary">Entrar</button>
  </form>
);