import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

const ID_EJECUCION = randomUUID(); // Identificador único de esta ejecución del servidor

// El JWT solo lleva el identificador mínimo del usuario.
// Si la API se reinicia, los tokens anteriores dejan de valer (ID_EJECUCION).
export const generarJWT = (id_usuario) =>
    jwt.sign(
        { 
            id: id_usuario,
            ejecucion: ID_EJECUCION
        }, 
        process.env.SC_JWT, 
        { expiresIn: process.env.JWT_EXPIRA || '8h' }
    );

export const verificarJWT = (token) => {
    const datos = jwt.verify(token, process.env.SC_JWT);

    if (datos.ejecucion !== ID_EJECUCION) {
        throw new Error('Sesión inválida: la API se reinició');
    }

    return datos;
};

// Token del enlace de confirmación de correo. No depende de la ejecución del servidor
// (el enlace sigue sirviendo aunque se reinicie) y solo vale para confirmar esa cuenta.
const PROPOSITO_CONFIRMAR = 'confirmar-correo';

export const generarTokenConfirmacion = (id_usuario) =>
    jwt.sign({ id: id_usuario, proposito: PROPOSITO_CONFIRMAR }, process.env.SC_JWT, { expiresIn: '24h' });

export const verificarTokenConfirmacion = (token) => {
    const datos = jwt.verify(token, process.env.SC_JWT);
    if (datos.proposito !== PROPOSITO_CONFIRMAR) throw new Error('Token no válido para confirmar la cuenta');
    return datos;
};
