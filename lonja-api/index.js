// Lonja API: REST API con JSON Web Token.
// No tiene vistas: todas las respuestas son JSON (o el PDF de los reportes).
// La consume el proyecto lonja-cliente con fetch y el encabezado Authorization: Bearer <token>.
import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { db } from './models/index.js';
import { CARPETA_ESPECIES } from './helpers/imagenes.js';
import { configurarCors } from './middleware/seguridad.js';
import { noEncontrado, manejarErrores } from './middleware/errores.js';

import authRouter from './routes/authRouter.js';
import loteRouter from './routes/loteRouter.js';
import tipoRouter from './routes/tipoRouter.js';
import compradorRouter from './routes/compradorRouter.js';
import compraRouter from './routes/compraRouter.js';
import reporteRouter from './routes/reporteRouter.js';
import usuarioRouter from './routes/usuarioRouter.js';
import publicacionRouter from './routes/publicacionRouter.js';
import catalogoRouter from './routes/catalogoRouter.js';
import misComprasRouter from './routes/misComprasRouter.js';

dotenv.config({ path: '.env' });

// Crear la aplicación
const app = express();
app.use(helmet());
app.disable('x-powered-by');
// El cliente reenvía la IP del navegador (X-Forwarded-For) para los límites de intentos
app.set('trust proxy', 'loopback');

// CORS: lista blanca (el cliente y los orígenes de CORS_ORIGENES)
app.use(configurarCors);

// Middleware para parsear JSON
app.use(express.json({ limit: '100kb' }));

// Imágenes de las especies (el cliente las muestra a través de su propio servidor)
app.use('/uploads/especies', express.static(CARPETA_ESPECIES, { index: false }));

// Routing
app.get(['/', '/api'], (req, res) => {
    res.json({
        mensaje: 'Lonja API - REST API con JSON Web Token',
        autenticacion: 'POST /api/auth/login -> { token }. Después: Authorization: Bearer <token>',
        endpoints: {
            auth: '/api/auth',
            dashboard: '/api/dashboard',
            lotes: '/api/lotes',
            tipos: '/api/tipos',
            ventas: '/api/ventas',
            catalogo: '/api/catalogo',
            compras: '/api/compras',
            misCompras: '/api/mis-compras',
            compradores: '/api/compradores',
            reportes: '/api/reportes',
            usuarios: '/api/usuarios'
        }
    });
});
app.use('/api/auth', authRouter);
app.use('/api', reporteRouter); // /api/dashboard y /api/reportes
app.use('/api/lotes', loteRouter);
app.use('/api/tipos', tipoRouter);
app.use('/api/compradores', compradorRouter);
app.use('/api/compras', compraRouter);
app.use('/api/usuarios', usuarioRouter);
app.use('/api/ventas', publicacionRouter);
app.use('/api/catalogo', catalogoRouter);
app.use('/api/mis-compras', misComprasRouter);

app.use(noEncontrado);
app.use(manejarErrores);

// Conexión a la BD (las tablas se crean con "npm run instalar", no aquí)
try {
    await db.authenticate();
    console.log('Conexión a MariaDB correcta');
} catch (error) {
    console.error('No se pudo conectar a MariaDB:', error.message);
}

// Definiendo el puerto
const puerto = process.env.PORT_API || 2900;
app.listen(puerto, () => {
    console.log(`Lonja API esperando peticiones en http://localhost:${puerto}/api`);
});
