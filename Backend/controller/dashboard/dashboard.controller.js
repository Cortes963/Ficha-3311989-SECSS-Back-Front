import db from '../../db.js';

/**
 * Obtener estadísticas globales del sistema SECSS
 */
export const getDashboardSummary = async (req, res) => {
  try {
    // . Vehículos actualmente en las instalaciones (Salida NULL)
    const [dentro] = await db.query(
      'SELECT COUNT(*) AS total_dentro FROM entrada_salida WHERE fecha_hora_salida IS NULL'
    );

    // . Cupos activos otorgados por tipo
    const [cupos] = await db.query(
      'SELECT COUNT(*) AS total_cupos_activos FROM cupo WHERE estado = 1'
    );

    // . PQRS radicadas sin resolver
    const [pqrsPendientes] = await db.query(
      'SELECT COUNT(*) AS total_pqrs_pendientes FROM pqrs WHERE estado IN (1, 2)'
    );

    //. Desglose de entradas hoy por tipo de vehículo
    const [porVehiculo] = await db.query(
      `SELECT v.tipo_vehiculo, COUNT(es.id) AS cantidad
       FROM entrada_salida es
       INNER JOIN vehiculo v ON es.id_vehiculo = v.id
       WHERE DATE(es.fecha_hora_ingreso) = CURDATE()
       GROUP BY v.tipo_vehiculo`
    );

    res.json({
      ok: true,
      metrics: {
        vehiculos_dentro: dentro[0].total_dentro,
        cupos_activos: cupos[0].total_cupos_activos,
        pqrs_pendientes: pqrsPendientes[0].total_pqrs_pendientes,
        ingresos_hoy: porVehiculo
      }
    });

  } catch (error) {
    console.error('Error en dashboard.getDashboardSummary:', error);
    res.status(500).json({ ok: false, mensaje: 'Error al consultar las métricas del panel.' });
  }
};