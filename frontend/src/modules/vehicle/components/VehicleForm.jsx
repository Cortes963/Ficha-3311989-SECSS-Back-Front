import { useMemo, useState } from 'react';
import { storageUrl } from '@/utils/media';
import {
  CAMPOS_IMAGEN,
  CLASES_BICICLETA,
  ETIQUETA_IMAGEN,
  ETIQUETA_TIPO,
  TIPOS_VEHICULO,
  normalizarTipo
} from '@/modules/vehicle/services/vehicleService';

/**
 * Formulario único de matrícula de vehículos.
 *
 * Sirve para los tres modos del módulo:
 *   - Registrar  -> initialData = null
 *   - Editar     -> initialData = vehículo normalizado
 *   - Consultar  -> readOnly = true
 *
 * Los campos se pintan siguiendo la jerarquía: primero los datos del
 * supertipo `vehiculo`, luego los de la tabla hija (moto o bicicleta) y por
 * último los soportes documentales que exige cada subtipo.
 */

const ESTADO_INICIAL = {
  tipo_vehiculo: 'MOTO',
  marca: '',
  color: '',
  placa: '',
  cilindraje: '',
  modelo: '',
  numero_marco: '',
  clase_bicicleta: ''
};

const aEstadoDelFormulario = (initialData) => {
  if (!initialData) return ESTADO_INICIAL;
  const detalles = initialData.detalles || {};
  return {
    tipo_vehiculo: normalizarTipo(initialData.tipo_vehiculo),
    marca: initialData.marca || '',
    color: initialData.color || '',
    placa: detalles.placa || '',
    cilindraje: detalles.cilindraje ?? '',
    modelo: detalles.modelo ?? '',
    numero_marco: detalles.numero_marco || '',
    clase_bicicleta: detalles.clase_bicicleta || ''
  };
};

const anioActual = new Date().getFullYear();

export const VehicleForm = ({
  initialData = null,
  readOnly = false,
  saving = false,
  submitLabel = 'Guardar vehículo',
  onSubmit = null,
  onCancel = null
}) => {
  // La clave del padre (key={vehiculo.id}) remonta el formulario al cambiar de
  // registro, por eso el estado inicial se calcula una sola vez sin useEffect.
  const [campos, setCampos] = useState(() => aEstadoDelFormulario(initialData));
  const [archivos, setArchivos] = useState({});
  const [errores, setErrores] = useState({});

  const tipo = campos.tipo_vehiculo;
  const esMoto = tipo === 'MOTO';
  const imagenesPrevias = useMemo(() => initialData?.imagenes || {}, [initialData]);

  const cambiar = (event) => {
    const { name, value } = event.target;
    setCampos((actual) => ({ ...actual, [name]: value }));
    setErrores((actual) => ({ ...actual, [name]: undefined }));
  };

  const cambiarTipo = (event) => {
    // Al cambiar de subtipo se limpian los campos de la tabla hija anterior.
    const nuevo = normalizarTipo(event.target.value);
    setCampos((actual) => ({
      ...actual,
      tipo_vehiculo: nuevo,
      placa: '',
      cilindraje: '',
      modelo: '',
      numero_marco: '',
      clase_bicicleta: ''
    }));
    setArchivos({});
    setErrores({});
  };

  const cambiarArchivo = (campo) => (event) => {
    const archivo = event.target.files?.[0] || null;
    setArchivos((actual) => ({ ...actual, [campo]: archivo }));
  };

  const validar = () => {
    const nuevos = {};
    if (!campos.marca.trim()) nuevos.marca = 'La marca es obligatoria.';
    if (!campos.color.trim()) nuevos.color = 'El color es obligatorio.';

    if (esMoto) {
      if (!/^[A-Z]{3}\d{2}[A-Z0-9]$/.test(campos.placa.trim().toUpperCase())) {
        nuevos.placa = 'Formato de placa inválido (ejemplo: ABC12G).';
      }
      const cilindraje = Number(campos.cilindraje);
      if (!cilindraje || cilindraje < 50 || cilindraje > 2000) {
        nuevos.cilindraje = 'El cilindraje debe estar entre 50 y 2000 c.c.';
      }
      const modelo = Number(campos.modelo);
      if (!modelo || modelo < 1970 || modelo > anioActual + 1) {
        nuevos.modelo = `El modelo debe estar entre 1970 y ${anioActual + 1}.`;
      }
    } else {
      if (campos.numero_marco.trim().length < 5) {
        nuevos.numero_marco = 'El número de marco debe tener al menos 5 caracteres.';
      }
      if (!campos.clase_bicicleta) nuevos.clase_bicicleta = 'Seleccione la clase de bicicleta.';
    }

    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const enviar = (event) => {
    event.preventDefault();
    if (readOnly || !onSubmit || !validar()) return;

    const detalles = esMoto
      ? {
          placa: campos.placa.trim().toUpperCase(),
          cilindraje: Number(campos.cilindraje),
          modelo: Number(campos.modelo)
        }
      : {
          numero_marco: campos.numero_marco.trim().toUpperCase(),
          clase_bicicleta: campos.clase_bicicleta
        };

    onSubmit({
      tipo_vehiculo: tipo,
      marca: campos.marca.trim(),
      color: campos.color.trim(),
      detalles,
      imagenes: archivos
    });
  };

  const claseInput = (campo) => `form-control${errores[campo] ? ' is-invalid' : ''}`;

  return (
    <form className="card border-0 shadow-sm mb-4 border-top border-3 border-success" onSubmit={enviar} noValidate>
      <div className="card-header bg-white text-center py-3">
        <h2 className="h4 fw-bold m-0">Matrícula de Vehículos</h2>
        <p className="text-muted small mb-0">
          {readOnly ? 'Consulta del vehículo registrado' : 'Complete los datos del vehículo y sus soportes'}
        </p>
      </div>

      <div className="card-body p-4">
        {/* ---------- Tabla base: vehiculo ---------- */}
        <h5 className="text-secondary border-bottom pb-2 mb-3">Datos generales del vehículo</h5>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label small fw-bold" htmlFor="tipo_vehiculo">Tipo de vehículo</label>
            <select
              id="tipo_vehiculo"
              name="tipo_vehiculo"
              className="form-select"
              value={tipo}
              onChange={cambiarTipo}
              disabled={readOnly || Boolean(initialData?.id)}
            >
              {TIPOS_VEHICULO.map((valor) => (
                <option key={valor} value={valor}>{ETIQUETA_TIPO[valor]}</option>
              ))}
            </select>
            {initialData?.id && !readOnly && (
              <span className="form-text">El tipo no se puede cambiar; registre otro vehículo si es necesario.</span>
            )}
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-bold" htmlFor="marca">Marca</label>
            <input id="marca" name="marca" className={claseInput('marca')} value={campos.marca} onChange={cambiar} disabled={readOnly} />
            <div className="invalid-feedback">{errores.marca}</div>
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-bold" htmlFor="color">Color principal</label>
            <input id="color" name="color" className={claseInput('color')} value={campos.color} onChange={cambiar} disabled={readOnly} />
            <div className="invalid-feedback">{errores.color}</div>
          </div>
        </div>

        {/* ---------- Tabla hija: moto / bicicleta ---------- */}
        <h5 className="text-secondary border-bottom pb-2 mb-3 mt-4">
          Especificaciones técnicas · {ETIQUETA_TIPO[tipo]}
        </h5>

        {esMoto ? (
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-bold" htmlFor="placa">Placa</label>
              <input id="placa" name="placa" className={`${claseInput('placa')} text-uppercase`} value={campos.placa} onChange={cambiar} disabled={readOnly} maxLength={6} placeholder="ABC12G" />
              <div className="invalid-feedback">{errores.placa}</div>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold" htmlFor="cilindraje">Cilindraje (c.c.)</label>
              <input id="cilindraje" name="cilindraje" type="number" min={50} max={2000} className={claseInput('cilindraje')} value={campos.cilindraje} onChange={cambiar} disabled={readOnly} />
              <div className="invalid-feedback">{errores.cilindraje}</div>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold" htmlFor="modelo">Modelo (año)</label>
              <input id="modelo" name="modelo" type="number" min={1970} max={anioActual + 1} className={claseInput('modelo')} value={campos.modelo} onChange={cambiar} disabled={readOnly} />
              <div className="invalid-feedback">{errores.modelo}</div>
            </div>
          </div>
        ) : (
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-bold" htmlFor="numero_marco">Número de serial / marco</label>
              <input id="numero_marco" name="numero_marco" className={`${claseInput('numero_marco')} text-uppercase`} value={campos.numero_marco} onChange={cambiar} disabled={readOnly} />
              <div className="invalid-feedback">{errores.numero_marco}</div>
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-bold" htmlFor="clase_bicicleta">Clase de bicicleta</label>
              <select id="clase_bicicleta" name="clase_bicicleta" className={`form-select${errores.clase_bicicleta ? ' is-invalid' : ''}`} value={campos.clase_bicicleta} onChange={cambiar} disabled={readOnly}>
                <option value="">Seleccione...</option>
                {CLASES_BICICLETA.map((clase) => <option key={clase} value={clase}>{clase}</option>)}
              </select>
              <div className="invalid-feedback">{errores.clase_bicicleta}</div>
            </div>
          </div>
        )}

        {/* ---------- Soportes documentales ---------- */}
        <h5 className="text-secondary border-bottom pb-2 mb-3 mt-4">Soportes documentales</h5>
        <div className="row g-3">
          {CAMPOS_IMAGEN[tipo].map((campo) => {
            const previa = imagenesPrevias[campo];
            const seleccionado = archivos[campo];
            return (
              <div className="col-md-4" key={campo}>
                <label className="form-label small fw-bold" htmlFor={campo}>{ETIQUETA_IMAGEN[campo]}</label>
                {previa
                  ? <img className="img-thumbnail d-block mb-2" style={{ maxHeight: 110 }} src={storageUrl(previa)} alt={ETIQUETA_IMAGEN[campo]} />
                  : <p className="text-muted small mb-2">Sin soporte cargado.</p>}
                {!readOnly && (
                  <>
                    <input id={campo} type="file" className="form-control" accept="image/jpeg,image/png,image/webp" onChange={cambiarArchivo(campo)} />
                    <span className="form-text">
                      {seleccionado ? `Nuevo archivo: ${seleccionado.name}` : previa ? 'Deje vacío para conservar el actual.' : 'JPG, PNG o WEBP.'}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- Botonera ---------- */}
      {!readOnly && (
        <div className="card-footer bg-white d-flex justify-content-end gap-2 py-3">
          {onCancel && (
            <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={saving}>
              Cancelar
            </button>
          )}
          <button type="submit" className="btn btn-primary px-4 fw-bold" disabled={saving}>
            {saving ? 'Guardando...' : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
};
