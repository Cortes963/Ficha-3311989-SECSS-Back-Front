/**Verificación de estado de la API
 */
export const healthCheck = (req, res) => {
  res.json({
    ok: true,
    sistema: 'SECSS API Backend',
    estado: 'Operational',
    timestamp: new Date().toISOString()
  });
};