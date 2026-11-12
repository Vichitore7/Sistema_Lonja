import { Usuario } from '../models/index.js';
import { verificarJWT } from '../helpers/tokens.js';

// Valida el JWT de la cookie _token y vuelve a consultar al usuario en cada petición
// (si fue desactivado o cambió de rol, se aplica de inmediato)
const autenticar = async (req, res, next) => {
    const token = req.cookies?._token;
    if (!token) return res.redirect('/login');

    try {
        const { id } = verificarJWT(token);
        const usuario = await Usuario.findByPk(id);
        if (!usuario || !usuario.activo) {
            res.clearCookie('_token');
            return res.redirect('/login');
        }
        req.usuario = usuario;
        res.locals.usuario = usuario;
        return next();
    } catch {
        // token caducado o alterado
        res.clearCookie('_token');
        return res.redirect('/login');
    }
};

export default autenticar;
