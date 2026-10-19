const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

// Ruta para recuperar historial (convertimos a enteros con parseInt)
app.get('/api/mensajes/:user1/:user2', async (req, res) => {
    try {
        const u1 = parseInt(req.params.user1);
        const u2 = parseInt(req.params.user2);

        const query = `
            SELECT id, remitente, mensaje, creado_en, receptor 
            FROM mensajes 
            WHERE (remitente = $1 AND receptor = $2) 
               OR (remitente = $2 AND receptor = $1)
            ORDER BY id ASC 
            LIMIT 50;
        `;
        
        const result = await db.query(query, [u1, u2]);
        res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener historial:", err);
        res.status(500).json({ error: "Error al cargar mensajes" });
    }
});

io.on('connection', (socket) => {
    console.log(`> Usuario conectado: ${socket.id}`);

    socket.on('registrar_usuario', (userId) => {
        socket.join(`user_${userId}`);
    });

    socket.on('enviar_mensaje_privado', async (data) => {
        try {
            const queryInsert = `
                INSERT INTO mensajes (remitente, mensaje, receptor) 
                VALUES ($1, $2, $3) 
                RETURNING id, remitente, mensaje, creado_en, receptor;
            `;
            // Aseguramos que remitente y receptor viajen como enteros
            const values = [parseInt(data.remitente), data.mensaje, parseInt(data.receptor)];
            
            const result = await db.query(queryInsert, values);
            const mensajeGuardado = result.rows[0];

            io.to(`user_${data.receptor}`).emit('recibir_mensaje_privado', mensajeGuardado);
            socket.emit('recibir_mensaje_privado', mensajeGuardado);

        } catch (err) {
            console.error("Error al guardar mensaje en Neon:", err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`> Cliente desconectado: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});