// Nueva venta (Administrador): recarga al elegir lote y muestra total y diferencia mientras se escribe el precio.
// Es solo una vista previa: el servidor vuelve a calcular todo al publicar.
(() => {
    document.querySelectorAll('[data-enviar-al-cambiar]').forEach((sel) => sel.addEventListener('change', () => sel.form.submit()));

    const form = document.getElementById('formPublicar');
    if (!form) return;
    const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    const kilos = Number(form.dataset.kilos);
    const salida = Number(form.dataset.salida);
    const precio = document.getElementById('precio_kilo_final');
    // Igual que en el servidor: centavos para evitar errores de redondeo
    const total = (k, p) => Math.round((Math.round(k * 100) * Math.round(p * 100)) / 100) / 100;

    const actualizar = () => {
        const p = Number(precio.value);
        const valido = p > 0;
        const oferta = valido ? total(kilos, p) : 0;
        const diferencia = Math.round((oferta - total(kilos, salida)) * 100) / 100;
        document.getElementById('totalOferta').textContent = moneda.format(oferta);
        document.getElementById('diferenciaEstimada').textContent = valido ? `${diferencia > 0 ? '+' : ''}${moneda.format(diferencia)}` : '—';
    };
    precio.addEventListener('input', actualizar);
})();
