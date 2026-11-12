// Mensajes de éxito que se muestran después de un redirect (?msg=clave)
const MENSAJES = {
    'lote-creado': 'El lote se registró correctamente.',
    'lote-editado': 'Los cambios del lote se guardaron.',
    'lote-retirado': 'El lote se marcó como retirado.',
    'tipo-creado': 'El tipo se registró correctamente.',
    'tipo-editado': 'El tipo se actualizó.',
    'comprador-creado': 'El comprador se registró correctamente.',
    'comprador-editado': 'Los datos del comprador se actualizaron.',
    'lote-publicado': 'El lote se puso a la venta y ya aparece en el catálogo de los compradores.',
    'lote-despublicado': 'El lote se retiró del catálogo. Sigue disponible para volver a publicarlo.',
    'usuario-creado': 'La cuenta de empleado se creó correctamente.',
    'usuario-editado': 'La cuenta se actualizó.',
    'usuario-activado': 'La cuenta se activó.',
    'usuario-desactivado': 'La cuenta se desactivó; ya no podrá iniciar sesión.',
    'password-restablecida': 'La contraseña se restableció.',
    'sesion-cerrada': 'Cerraste sesión correctamente.',
    'cuenta-creada': 'Tu cuenta se creó correctamente. Ya puedes comprar lotes.',
    'compra-realizada': 'Compra realizada. El lote es tuyo y ya no aparece en el catálogo.',
    'cuenta-comprador-creada': 'Se creó la cuenta del comprador.',
    'cuenta-comprador-editada': 'Se actualizó el nombre de usuario del comprador.',
    'cuenta-comprador-activada': 'La cuenta del comprador se activó.',
    'cuenta-comprador-desactivada': 'La cuenta del comprador se desactivó; ya no podrá iniciar sesión ni comprar.',
    'password-comprador-restablecida': 'La contraseña del comprador se restableció.'
};

export const mensajeExito = (clave) => MENSAJES[clave] || null;

// Mensajes de error que se muestran después de un redirect (?error=clave)
const ERRORES = {
    'lote-no-disponible': 'Solo se pueden editar o retirar lotes con estado Disponible.',
    'usuario-no-editable': 'Solo se pueden administrar cuentas de Empleado.',
    'lote-publicado': 'El lote está a la venta. Retíralo del catálogo en Gestión de ventas antes de editarlo.',
    'lote-no-despublicable': 'Solo se pueden retirar del catálogo lotes disponibles que estén a la venta.',
    'lote-agotado': 'Este lote ya no está disponible.',
    'oferta-retirada': 'La oferta de ese lote fue retirada del catálogo.',
    'precio-no-valido': 'Ese lote no tiene un precio válido en este momento. Inténtalo más tarde.',
    'comprador-sin-cuenta': 'Este comprador no tiene cuenta.',
    'comprador-ya-tiene-cuenta': 'Este comprador ya tiene una cuenta.'
};

export const mensajeError = (clave) => ERRORES[clave] || null;
