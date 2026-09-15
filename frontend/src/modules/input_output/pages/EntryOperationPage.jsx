import { useEffect, useState } from 'react';
import { listarCupos, obtenerDetalleCupo } from '@/modules/quota/services/Quotaservices';
import { registrarEntrada, registrarSalida } from '@/modules/input_output/services/input_outputservice';
import { FormField } from '@/components/ui/FormField';

export const EntryOperationPage = () => {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { listarCupos().then(setRows).catch((e) => setMessage(e.message)); }, []);
  const selectQuota = async (row) => {
    setSelected(row);
    setDetail(null);
    setLoadingDetail(true);
    try { setDetail(await obtenerDetalleCupo(row.id_usuario, row.id_vehiculo)); } catch (e) { setMessage(e.message); } finally { setLoadingDetail(false); }
  };
  const operate = async (type) => {
    try {
      const result = type === 'entrada'
        ? await registrarEntrada({ id_usuario_entra: selected.id_usuario, id_vehiculo: selected.id_vehiculo })
        : await registrarSalida(detail.idEntradaAbierta || selected.registro_id);
      setMessage(result.mensaje);
    } catch (e) { setMessage(e.message); }
  };
  return <section className="card p-4"><h2 className="h4">Registrar operación</h2><FormField label="Cupo / vehículo" name="cupo" value={selected ? `${selected.usuario || ''} · ${selected.identificador_vehiculo || ''}` : ''} readOnly placeholder="Seleccione un cupo" /><div className="list-group mb-3">{rows.map((row) => <button type="button" className="list-group-item list-group-item-action" key={`${row.id_usuario}-${row.id_vehiculo}`} onClick={() => selectQuota(row)}>{row.usuario || row.numero_documento} · {row.tipo_vehiculo} · {row.identificador_vehiculo}</button>)}</div>{loadingDetail && <div className="alert alert-info">Cargando autorización, aprendiz, centro y vehículo...</div>}{detail && <div className="border rounded p-3 mb-3"><h3 className="h5">Información validada</h3><dl className="row mb-0">{[['Usuario', detail.usuario], ['Documento', detail.numero_documento], ['Ficha', detail.ficha], ['Centro', detail.nombre_centro], ['Vinculación', detail.fecha_vinculacion], ['Terminación', detail.fecha_terminacion], ['Vehículo', `${detail.tipo_vehiculo || ''} ${detail.marca || ''}`], ['Placa / marco', detail.identificador_vehiculo], ['Autorización', detail.estado_autorizacion || detail.estado], ['Auditor', detail.administrador_auditor]].map(([label, value]) => <div className="row" key={label}><dt className="col-sm-4">{label}</dt><dd className="col-sm-8">{value || '—'}</dd></div>)}</dl></div>}<div className="d-flex gap-2">{detail && !loadingDetail && detail.estado === 1 && <><button type="button" className="btn btn-primary" onClick={() => operate('entrada')}>Registrar entrada</button><button type="button" className="btn btn-outline-primary" onClick={() => operate('salida')}>Registrar salida</button></>}</div>{message && <p className="mt-3 mb-0">{message}</p>}</section>;
};
