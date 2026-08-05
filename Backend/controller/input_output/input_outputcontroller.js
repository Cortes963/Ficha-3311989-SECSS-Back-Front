const db = require ('../config/db.js');


// Guardar todos los registros de entrada y salida 

const ObtenerRegistros = async (req, res) => {
    try {
        const [rows] = await db.query ('SELECT * FROM entrada_salida');
        res.json({ status: 'success', data: rows });
    } catch (error){
        res.status(500).json ({ status: 'error', mesage: error.message});
    }
};

// crear registro 

