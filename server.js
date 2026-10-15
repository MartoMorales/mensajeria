const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', async (socket) => {
    console.log(`> Nuevo cliente conectado: ${socket.id}`);

    // Enviar historial de mensajes solo a este socket (al conectar o reconectar)
    try {
        const result = await db.query(
            'SELECT id, remitente, mensaje, creado_en FROM mensajes ORDER BY id ASC LIMIT 50'
        );
        socket.emit('cargar_historial', result.rows);
    } catch (err) {
        console.error('> Error al cargar historial de mensajes:', err);
    }

    socket.on('enviar_mensaje', async (data) => {
        try {
            // Guardar mensaje en Neon PostgreSQL
            const result = await db.query(
                'INSERT INTO mensajes (remitente, mensaje) VALUES ($1, $2) RETURNING id, remitente, mensaje, creado_en',
                [data.remitente, data.mensaje]
            );
            const nuevoMensaje = result.rows[0];

            // Emitir a todos los clientes conectados en tiempo real
            io.emit('recibir_mensaje', nuevoMensaje);
        } catch (err) {
            console.error('> Error al guardar el mensaje en la BD:', err);
            io.emit('recibir_mensaje', data);
        }
    });

    socket.on('disconnect', () => {
        console.log(`> Cliente desconectado: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});