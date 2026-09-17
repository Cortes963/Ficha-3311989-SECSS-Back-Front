import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { obtenerEntradaSalida } from '@/modules/input_output/services/input_outputservice';
import { UserForm } from '@/modules/user/components/UserForm';
import { ApprenticeDetailForm } from '@/modules/user/components/ApprenticeDetailForm';
import { VehicleDetailForm } from '@/modules/vehicle/components/VehicleDetailForm';

export const EntryDetailPage = () => {
  const { id } = useParams();
  const [row, setRow] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { obtenerEntradaSalida(id).then(setRow).catch((e) => setError(e.message)); }, [id]);
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!row) return <div className="alert alert-info">Cargando registro de entrada/salida...</div>;
  const estado = row.fecha_hora_salida ? 'FUERA' : 'DENTRO';
  const vehicle = { tipo_vehiculo: row.tipo_vehiculo, marca: row.marca, color: row.color, imagen_url_tarjeta_propiedad: row.imagen_url_tarjeta_propiedad, imagen_url_identificacion_vehiculo: row.imagen_url_identificacion_vehiculo, imagen_url_vehiculo: row.imagen_url_vehiculo, detalles: { placa: row.placa, numero_marco: row.numero_marco, imagen_url_soat: row.imagen_url_soat, imagen_url_tecnomecanica_vigente: row.imagen_url_tecnomecanica_vigente } };
  const person = { tipo_documento: row.tipo_documento, numero_documento: row.documento_persona, primer_nombre: row.primer_nombre, segundo_nombre: row.segundo_nombre, primer_apellido: row.primer_apellido, segundo_apellido: row.segundo_apellido, n_celular: row.n_celular, correo: row.correo, estado: row.usuario_estado, cuenta_created_at: row.cuenta_created_at };
  const apprentice = row.ficha ? { ficha: row.ficha, fecha_vinculacion: row.fecha_vinculacion, fecha_terminacion: row.fecha_terminacion, nombre_centro: row.nombre_centro } : null;
  return <div className="card p-4 border-0 shadow-sm">
    <div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h4 mb-0">Detalle de entrada/salida</h2><Link to="/entradas-salidas" className="btn btn-outline-secondary">Volver</Link></div>
    <dl className="row mb-3">{[['Registro', row.registro_id || row.id], ['Ingreso', row.fecha_hora_ingreso], ['Salida', row.fecha_hora_salida || 'Dentro'], ['Celador de ingreso', row.celador_ingreso], ['Celador de salida', row.celador_salida], ['Estado', estado]].map(([label, value]) => <div className="row" key={label}><dt className="col-sm-4">{label}</dt><dd className="col-sm-8">{value || '—'}</dd></div>)}</dl>
    <h3 className="h5">Usuario</h3><UserForm initialData={person} mode="consulta" readOnly />
    {apprentice && <><h3 className="h5">Detalle académico</h3><ApprenticeDetailForm initialData={apprentice} mode="consulta" readOnly /></>}
    <h3 className="h5">Vehículo</h3><VehicleDetailForm initialData={vehicle} readOnly />
  </div>;
};
