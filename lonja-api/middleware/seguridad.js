import cors from 'cors';
import { urlCliente } from '../helpers/correos.js';

// ---------- CORS (lista blanca de orígenes) ----------
// El cliente llama a la API desde su servidor (no desde el navegador), así que normalmente
// no hay encabezado Origin. Si un navegador llama directo, solo URL_CLIENTE y CORS_ORIGENES
// reciben las cabeceras CORS.
const origenesPermitidos = () => new Set([
    urlCliente(),
    ...String(process.env.CORS_ORIGENES || '').split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean)
]);

export const configurarCors = cors({
    origin: (origen, listo) => listo(null, !origen || origenesPermitidos().has(origen)),
    methods: ['GET', 'POST', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
});

const demasiadas = (error) => (req, res) => res.status(429).json({ error });

// ---------- Límite de intentos de login (en memoria) ----------
const intentos = new Map();
const VENTANA_MS = 15 * 60 * 1000;
const MAX_INTENTOS = 5;

const clave = (req) => `${req.ip}|${String(req.body?.nombre_usuario || '').toLowerCase()}`;

export const limitarLogin = (req, res, next) => {
    const registro = intentos.get(clave(req));
    if (registro && registro.cuenta >= MAX_INTENTOS && Date.now() - registro.inicio < VENTANA_MS) {
        return demasiadas('Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.')(req, res);
    }
    next();
};

export const registrarIntentoFallido = (req) => {
    const k = clave(req);
    const registro = intentos.get(k);
    if (!registro || Date.now() - registro.inicio >= VENTANA_MS) intentos.set(k, { cuenta: 1, inicio: Date.now() });
    else registro.cuenta += 1;
};

export const limpiarIntentos = (req) => intentos.delete(clave(req));

// ---------- Límite de solicitudes de registro y de compra (en memoria) ----------
const crearLimite = ({ ventanaMs, max, clave: obtenerClave, alExceder }) => {
    const cuentas = new Map();
    return (req, res, next) => {
        const k = obtenerClave(req);
        const ahora = Date.now();
        const registro = cuentas.get(k);
        if (!registro || ahora - registro.inicio >= ventanaMs) {
            cuentas.set(k, { cuenta: 1, inicio: ahora });
            // limpieza ocasional de claves vencidas
            if (cuentas.size > 5000) for (const [c, r] of cuentas) if (ahora - r.inicio >= ventanaMs) cuentas.delete(c);
            return next();
        }
        registro.cuenta += 1;
        return registro.cuenta > max ? alExceder(req, res) : next();
    };
};

// Máximo 10 registros por IP cada 15 minutos
export const limitarRegistro = crearLimite({
    ventanaMs: VENTANA_MS, max: 10, clave: (req) => req.ip,
    alExceder: demasiadas('Se enviaron demasiados registros desde este equipo. Espera unos minutos e inténtalo de nuevo.')
});

// Máximo 5 reenvíos del correo de confirmación por IP cada 15 minutos
export const limitarReenvio = crearLimite({
    ventanaMs: VENTANA_MS, max: 5, clave: (req) => req.ip,
    alExceder: demasiadas('Pediste demasiados correos de confirmación. Espera unos minutos e inténtalo de nuevo.')
});

// Máximo 20 intentos de compra por cuenta cada minuto
export const limitarCompra = crearLimite({
    ventanaMs: 60 * 1000, max: 20, clave: (req) => `u${req.usuario?.id_usuario ?? req.ip}`,
    alExceder: demasiadas('Hiciste demasiados intentos de compra en poco tiempo. Espera un minuto e inténtalo de nuevo.')
});
