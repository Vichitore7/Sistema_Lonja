// Uso: autorizarRol('ADMINISTRADOR'), autorizarRol('ADMINISTRADOR', 'EMPLEADO') o autorizarRol('COMPRADOR')
// Ocultar botones no basta: el rol se comprueba aquí, en el servidor
const autorizarRol = (...roles) => (req, res, next) => {
    if (req.usuario && roles.includes(req.usuario.rol)) return next();
    return res.status(403).render('errores/error', {
        pagina: 'Acceso denegado',
        codigo: 403,
        titulo: 'Acceso denegado',
        detalle: 'Tu cuenta no tiene permiso para entrar a esta sección.'
    });
};

export default autorizarRol;
