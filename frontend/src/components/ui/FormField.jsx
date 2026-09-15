export const FormField = ({ label, name, value, onChange, type = 'text', required = false, readOnly = false, children, ...props }) => (
  <div className="mb-3">
    <label className="form-label" htmlFor={name}>{label}</label>
    {children || <input id={name} name={name} type={type} value={value ?? ''} onChange={onChange} required={required} readOnly={readOnly} className="form-control" {...props} />}
  </div>
);
