// Uso: autorizarRol('ADMINISTRADOR'), autorizarRol('ADMINISTRADOR', 'EMPLEADO') o autorizarRol('COMPRADOR')
// El rol siempre se comprueba aquí, en la API (el cliente solo oculta los botones)
const autorizarRol = (...roles) => (req, res, next) => {
    if (req.usuario && roles.includes(req.usuario.rol)) return next();
    return res.status(403).json({ error: 'Tu cuenta no tiene permiso para esta operación' });
};

export default autorizarRol;
