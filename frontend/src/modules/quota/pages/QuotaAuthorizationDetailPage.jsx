import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { obtenerDetalleCupo, actualizarEstadoCupo } from '@/modules/quota/services/Quotaservices';
import { VehicleForm } from '@/modules/vehicle/components/VehicleForm';
import { VehicleDetailForm } from '@/modules/vehicle/components/VehicleDetailForm';
import { useAuth } from '@/modules/auth/context/AuthContext';

export const QuotaAuthorizationDetailPage = () => {
  const { idUsuario, idVehiculo } = useParams();
  const { user } = useAuth();
  const [row, setRow] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const numericUserId = Number(idUsuario);
  const numericVehicleId = Number(idVehiculo);
  const invalidIds = !Number.isInteger(numericUserId) || !Number.isInteger(numericVehicleId) || numericUserId < 1 || numericVehicleId < 1;
  useEffect(() => {
    if (invalidIds) return undefined;
    const request = obtenerDetalleCupo(numericUserId, numericVehicleId);
    request.then(setRow).catch((e) => setError(e.message)).finally(() => setLoaded(true));
    return undefined;
  }, [invalidIds, numericUserId, numericVehicleId]);
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (invalidIds) return <div className="alert alert-danger">La autorización requiere identificadores numéricos válidos.</div>;
  if (!loaded) return <div className="alert alert-info">Cargando autorización de vehículo...</div>;
  if (!row) return <div className="card p-4 border-0 shadow-sm"><h2 className="h4">Registrar vehículo</h2><p className="text-muted">Este usuario no tiene un vehículo o autorización asociada.</p><VehicleForm onSubmit={() => setMessage('El contrato actual no expone registro de vehículo/cupo; no se envió ningún cambio.')} /><VehicleDetailForm initialData={null} readOnly /><div className="alert alert-info">El backend actual no expone un endpoint de alta de vehículo/cupo para esta vista.</div></div>;
  const own = Number(row.id_usuario) === Number(user?.id);
  const canEdit = own && user?.roles?.some((role) => ['APRENDIZ', 'INVITADO'].includes(role));
  const isAdmin = user?.roles?.includes('ADMINISTRADOR');
  const isCelador = user?.roles?.includes('CELADOR');
  const disable = async () => {
    try { const response = await actualizarEstadoCupo(row.id_usuario, row.id_vehiculo, 0); setMessage(response.mensaje); setRow({ ...row, estado: 0, estado_autorizacion: 'SUSPENDIDO' }); } catch (e) { setMessage(e.message); }
  };
  const vehicle = { tipo_vehiculo: row.tipo_vehiculo, marca: row.marca, color: row.color, detalles: { placa: row.placa, cilindraje: row.cilindraje, modelo: row.modelo, numero_marco: row.numero_marco, clase_bicicleta: row.clase_bicicleta } };
  return <div className="card p-4 border-0 shadow-sm">
    <div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h4 mb-0">Detalle de autorización</h2><div className="d-flex gap-2"><Link to="/cupos" className="btn btn-outline-secondary">Volver</Link>{isCelador && <Link to="/entradas-salidas/operar" className="btn btn-primary">Registrar operación</Link>}{isAdmin && row.estado !== 0 && <button className="btn btn-outline-danger" onClick={disable}>Deshabilitar</button>}{canEdit && <button className="btn btn-primary" onClick={() => setEditing((value) => !value)}>{editing ? 'Cancelar edición' : 'Editar'}</button>}</div></div>
    <dl className="row mb-4">{[['Usuario', row.usuario], ['Documento', row.numero_documento], ['Ficha', row.ficha], ['Centro', row.nombre_centro], ['Fecha de vinculación', row.fecha_vinculacion], ['Fecha de terminación', row.fecha_terminacion], ['Estado', row.estado_autorizacion || row.estado], ['Administrador auditor', row.administrador_auditor]].map(([label, value]) => <div className="row" key={label}><dt className="col-sm-4">{label}</dt><dd className="col-sm-8">{value || '—'}</dd></div>)}</dl>
    <h3 className="h5">Vehículo y detalle técnico</h3>
    {editing ? <VehicleForm initialData={vehicle} readOnly={false} onSubmit={() => setMessage('El contrato actual no expone edición de vehículo/cupo; no se envió ningún cambio.')} /> : <VehicleDetailForm initialData={vehicle} readOnly />}
    {!row.id_vehiculo && <><h3 className="h5 mt-3">Registrar vehículo</h3><VehicleForm onSubmit={() => setMessage('El contrato actual no expone registro de vehículo/cupo; no se envió ningún cambio.')} /><VehicleDetailForm initialData={null} readOnly /></>}
    {message && <div className="alert alert-info">{message}</div>}
  </div>;
};
