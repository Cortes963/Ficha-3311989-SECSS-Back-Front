import { useState } from 'react';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { radicarPqrs } from '@/modules/pqrs/services/pqrsService';

export const ReportForm = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState({ asunto: '', cuerpo: '' });
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const actualizarCampo = ({ target: { name, value } }) =>
    setReportData((anterior) => ({ ...anterior, [name]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMensaje(null);
    setEnviando(true);
    try {
      const respuesta = await radicarPqrs({
        id_usuario: user.id,
        asunto: reportData.asunto.trim(),
        cuerpo: reportData.cuerpo.trim()
      });
      setMensaje({ tipo: 'success', texto: `${respuesta.mensaje}. Radicado: ${respuesta.id_pqrs}.` });
      setReportData({ asunto: '', cuerpo: '' });
    } catch (error) {
      setMensaje({ tipo: 'danger', texto: error.message || 'No fue posible radicar la PQRS.' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="card shadow-sm border-0 border-top border-danger border-4">
      <div className="card-header bg-white p-3 border-bottom-0">
        <h4 className="text-danger m-0 fw-bold">Generación de PQRS</h4>
      </div>
      <div className="card-body p-4">
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label fw-bold small" htmlFor="asunto">Asunto breve</label>
              <input id="asunto" type="text" name="asunto" className="form-control" placeholder="Ej: Daño en talanquera" value={reportData.asunto} onChange={actualizarCampo} required />
            </div>
            <div className="col-12">
              <label className="form-label fw-bold small" htmlFor="cuerpo">Descripción detallada</label>
              <textarea id="cuerpo" name="cuerpo" className="form-control" rows="5" placeholder="Describa los hechos, fechas y horas..." value={reportData.cuerpo} onChange={actualizarCampo} required />
              <div className="form-text">La API actual registra asunto y descripción; los adjuntos se implementan en una fase posterior.</div>
            </div>
            {mensaje && <div className={`col-12 alert alert-${mensaje.tipo} mb-0`} role="alert">{mensaje.texto}</div>}
            <div className="col-12 text-end mt-4">
              <button type="button" className="btn btn-light me-2" onClick={() => setReportData({ asunto: '', cuerpo: '' })}>Limpiar</button>
              <button type="submit" className="btn btn-danger px-4 fw-bold" disabled={enviando}>{enviando ? 'Radicando…' : 'Radicar PQRS'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
