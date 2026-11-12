import jwt from 'jsonwebtoken';

// El JWT solo lleva el identificador mínimo del usuario
export const generarJWT = (id_usuario) =>
    jwt.sign({ id: id_usuario }, process.env.SC_JWT, { expiresIn: process.env.JWT_EXPIRA || '8h' });

export const verificarJWT = (token) => jwt.verify(token, process.env.SC_JWT);

export const opcionesCookie = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000
});
