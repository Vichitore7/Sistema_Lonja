import { Usuario } from '../models/index.js';
import { verificarJWT } from '../helpers/tokens.js';

// requireAuth: lee el JWT del encabezado "Authorization: Bearer <token>",
// valida firma y expiración y vuelve a consultar al usuario en cada petición
// (si fue desactivado o cambió de rol, se aplica de inmediato).
const autenticar = async (req, res, next) => {
    const [esquema, token] = (req.get('authorization') || '').split(' ');
    if (esquema !== 'Bearer' || !token) return res.status(401).json({ error: 'Token requerido' });

    let datos;
    try {
        datos = verificarJWT(token); // { id, ejecucion, iat, exp }
    } catch (error) {
        return res.status(401).json({ error: error.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido' });
    }

    const usuario = await Usuario.findByPk(datos.id);
    // Una cuenta COMPRADOR sin comprador ligado no puede operar
    if (!usuario || !usuario.activo || !usuario.confirmado || (usuario.rol === 'COMPRADOR' && !usuario.codigo_cpr)) {
        return res.status(401).json({ error: 'La cuenta no está activa' });
    }
    req.usuario = usuario;
    return next();
};

export default autenticar;
