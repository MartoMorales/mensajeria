require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
    ssl: {
        rejectUnauthorized: false
    }
});

// Inicializar la tabla de mensajes si no existe
async function initDb() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS mensajes (
            id SERIAL PRIMARY KEY,
            remitente VARCHAR(100) NOT NULL,
            mensaje TEXT NOT NULL,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(createTableQuery);
        console.log('> Conexión con Neon exitosa y tabla "mensajes" lista.');
    } catch (err) {
        console.error('> Error al inicializar la tabla en Neon:', err);
    }
}

initDb();

pool.on('error', (err) => {
    console.error('> Error inesperado en el pool de PostgreSQL:', err);
});

module.exports = pool;

