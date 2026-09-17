export const storageUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  const base = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  return `${base.replace(/\/api\/?$/, '')}/storage/${value}`;
};

export const appendFiles = (form, files = {}) => {
  Object.entries(files).forEach(([name, file]) => {
    if (file instanceof File) form.append(name, file);
  });
};
