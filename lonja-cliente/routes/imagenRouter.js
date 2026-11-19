import express from 'express';
import { API_URL } from '../helpers/api.js';

// Las imágenes de las especies se guardan en la API (lonja-api/uploads/especies).
// El cliente las pide a la API y las entrega desde su propio dominio.
const router = express.Router();
const NOMBRE_VALIDO = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;

router.get('/:nombre', async (req, res, next) => {
    if (!NOMBRE_VALIDO.test(req.params.nombre)) return next();
    let respuesta;
    try {
        respuesta = await fetch(`${new URL(API_URL()).origin}/uploads/especies/${req.params.nombre}`);
    } catch {
        return res.sendStatus(503);
    }
    if (!respuesta.ok) return next();
    res.set({ 'Content-Type': respuesta.headers.get('content-type'), 'Cache-Control': 'public, max-age=86400' });
    res.send(Buffer.from(await respuesta.arrayBuffer()));
});

export default router;
