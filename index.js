import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'node:path';
import { db } from './models/index.js';
import * as formatos from './helpers/formatos.js';
import { mensajeExito, mensajeError } from './helpers/mensajes.js';
import { prepararCsrf, verificarCsrfGlobal } from './middleware/seguridad.js';
import { noEncontrado, manejarErrores } from './middleware/errores.js';

import authRouter from './routes/authRouter.js';
import dashboardRouter from './routes/dashboardRouter.js';
import inventarioRouter from './routes/inventarioRouter.js';
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

const app = express();

// Cabeceras seguras (los recursos se sirven desde este mismo servidor)
app.use(helmet({
    contentSecurityPolicy: {
        directives: { 'img-src': ["'self'", 'data:', 'blob:'], 'upgrade-insecure-requests': null }
    }
}));
app.disable('x-powered-by');

// Archivos estáticos: CSS/JS propios, Bootstrap, iconos Lucide y fuentes Poppins/Inter
app.use(express.static('public'));
app.use('/vendor/lucide', express.static(path.resolve('node_modules/lucide-static/font')));
app.use('/vendor/fuentes/poppins', express.static(path.resolve('node_modules/@fontsource/poppins')));
app.use('/vendor/fuentes/inter', express.static(path.resolve('node_modules/@fontsource/inter')));

// Vistas EJS
app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// Datos disponibles en todas las vistas
app.use((req, res, next) => {
    res.locals.f = formatos;
    res.locals.usuario = null;
    res.locals.rutaActual = req.path;
    res.locals.fechaHoy = formatos.formatoFechaLarga();
    res.locals.exito = mensajeExito(req.query.msg);
    res.locals.alerta = mensajeError(req.query.error);
    next();
});

app.use(prepararCsrf);
app.use(verificarCsrfGlobal);

// Rutas
app.use('/', authRouter);
app.use('/dashboard', dashboardRouter);
app.use('/inventario', inventarioRouter);
app.use('/lotes', loteRouter);
app.use('/tipos', tipoRouter);
app.use('/compradores', compradorRouter);
app.use('/compras', compraRouter);
app.use('/reportes', reporteRouter);
app.use('/usuarios', usuarioRouter);
app.use('/ventas', publicacionRouter);
app.use('/catalogo', catalogoRouter);
app.use('/mis-compras', misComprasRouter);

app.use(noEncontrado);
app.use(manejarErrores);

// Conexión a la BD (las tablas se crean con "npm run instalar", no aquí)
try {
    await db.authenticate();
    console.log('Conexión a MariaDB correcta');
} catch (error) {
    console.error('No se pudo conectar a MariaDB:', error.message);
}

const puerto = process.env.PORT_BACKEND || 2800;
app.listen(puerto, () => {
    console.log(`Sistema Lonja en ${process.env.URL_BACKEND || 'http://localhost'}:${puerto}`);
});
