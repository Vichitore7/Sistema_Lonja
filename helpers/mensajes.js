// Mensajes de éxito que se muestran después de un redirect (?msg=clave)
const MENSAJES = {
    'lote-creado': 'El lote se registró correctamente.',
    'lote-editado': 'Los cambios del lote se guardaron.',
    'lote-retirado': 'El lote se marcó como retirado.',
    'tipo-creado': 'El tipo se registró correctamente.',
    'tipo-editado': 'El tipo se actualizó.',
    'comprador-creado': 'El comprador se registró correctamente.',
    'comprador-editado': 'Los datos del comprador se actualizaron.',
    'compra-registrada': 'La compra se registró y el lote pasó a Vendido.',
    'usuario-creado': 'La cuenta de empleado se creó correctamente.',
    'usuario-editado': 'La cuenta se actualizó.',
    'usuario-activado': 'La cuenta se activó.',
    'usuario-desactivado': 'La cuenta se desactivó; ya no podrá iniciar sesión.',
    'password-restablecida': 'La contraseña se restableció.',
    'sesion-cerrada': 'Cerraste sesión correctamente.'
};

export const mensajeExito = (clave) => MENSAJES[clave] || null;

// Mensajes de error que se muestran después de un redirect (?error=clave)
const ERRORES = {
    'lote-no-disponible': 'Solo se pueden editar o retirar lotes con estado Disponible.',
    'usuario-no-editable': 'Solo se pueden administrar cuentas de Empleado.'
};

export const mensajeError = (clave) => ERRORES[clave] || null;
