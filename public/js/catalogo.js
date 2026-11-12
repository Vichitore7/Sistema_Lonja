// Catálogo del comprador: confirmación accesible antes de comprar un lote.
// El formulario solo envía el token CSRF; el lote va en la URL y el precio lo pone el servidor.
(() => {
    const elemento = document.getElementById('modalCompra');
    if (!elemento) return;
    const modal = new bootstrap.Modal(elemento);
    const confirmar = document.getElementById('mcConfirmar');
    let pendiente = null;

    document.querySelectorAll('form[data-compra]').forEach((form) => {
        form.addEventListener('submit', (e) => {
            if (form.dataset.confirmado) return;
            e.preventDefault();
            pendiente = form;
            document.getElementById('mcLote').textContent = form.dataset.lote;
            document.getElementById('mcEspecies').textContent = form.dataset.especies;
            document.getElementById('mcKilos').textContent = form.dataset.kilos;
            document.getElementById('mcTotal').textContent = form.dataset.total;
            confirmar.disabled = false;
            modal.show();
        });
    });

    confirmar.addEventListener('click', () => {
        if (!pendiente) return;
        confirmar.disabled = true; // evita el doble envío
        pendiente.dataset.confirmado = '1';
        pendiente.submit();
    });
})();
