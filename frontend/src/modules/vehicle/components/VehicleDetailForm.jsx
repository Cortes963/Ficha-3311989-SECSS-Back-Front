import { VehicleForm } from './VehicleForm';

/** Vista de consulta: el mismo formulario, siempre en solo lectura. */
export const VehicleDetailForm = (props) => <VehicleForm {...props} readOnly />;
