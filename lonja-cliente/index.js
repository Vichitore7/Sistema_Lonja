// Lonja Cliente: pantallas (EJS) del Sistema Lonja de Veracruz.
// No tiene modelos ni conexión a MariaDB: todo lo pide a la Lonja API con fetch
// (helpers/api.js) y el JWT guardado en la cookie HttpOnly _token.
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'node:path';
import * as formatos from './helpers/formatos.js';
import { mensajeExito, mensajeError } from './helpers/mensajes.js';
import { API_URL } from './helpers/api.js';
import { prepararApi } from './middleware/sesion.js';
import { prepararCsrf, verificarCsrfGlobal, rechazarOrigenNoPermitido } from './middleware/seguridad.js';
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
import imagenRouter from './routes/imagenRouter.js';

dotenv.config({ path: '.env' });

const app = express();

// Cabeceras seguras (los recursos se sirven desde este mismo servidor)
app.use(helmet({
    // same-origin: el navegador manda el Origin real en los formularios del propio cliente
    // (con no-referrer, Chrome/Brave mandan "Origin: null" y el formulario se rechazaría)
    referrerPolicy: { policy: 'same-origin' },
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
// Imágenes de las especies: se piden a la API
app.use('/uploads/especies', imagenRouter);

// Vistas EJS
app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// Datos disponibles en todas las vistas y helper req.api() con el token de la cookie
app.use((req, res, next) => {
    res.locals.f = formatos;
    res.locals.usuario = null;
    res.locals.rutaActual = req.path;
    res.locals.fechaHoy = formatos.formatoFechaLarga();
    res.locals.exito = mensajeExito(req.query.msg);
    res.locals.alerta = mensajeError(req.query.error);
    next();
});
app.use(prepararApi);

// POST desde otros sitios se rechazan y todos los formularios llevan token CSRF
app.use(rechazarOrigenNoPermitido);
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

const puerto = process.env.PORT_CLIENTE || 3000;
app.listen(puerto, async () => {
    console.log(`Lonja Cliente en http://localhost:${puerto}`);
    console.log(`API: ${API_URL()}`);
    try {
        await fetch(API_URL());
    } catch {
        console.warn('Aviso: la Lonja API no responde. Enciéndela con "npm run server" en la carpeta lonja-api.');
    }
});
