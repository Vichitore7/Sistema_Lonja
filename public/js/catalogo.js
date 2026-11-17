// Catálogo del comprador: confirmación accesible antes de comprar un lote.
// La compra se envía en segundo plano (fetch): el comprador se queda en el catálogo y puede
// comprar varios lotes seguidos; solo va a "Mis compras" si él lo decide.
// El formulario solo envía el token CSRF; el lote va en la URL y el precio lo pone el servidor.
(() => {
    const elemento = document.getElementById('modalCompra');
    if (!elemento) return;
    const modal = new bootstrap.Modal(elemento);
    const confirmar = document.getElementById('mcConfirmar');
    const avisoEl = document.getElementById('avisoCompra');
    const aviso = new bootstrap.Toast(avisoEl, { delay: 7000 });
    let pendiente = null;
    let comprados = 0;

    const mostrarAviso = (ok, titulo, texto) => {
        avisoEl.classList.toggle('error', !ok);
        avisoEl.querySelector('.toast-body > i').className = ok ? 'icon-circle-check' : 'icon-circle-alert';
        document.getElementById('avisoCompraTitulo').textContent = titulo;
        document.getElementById('avisoCompraTexto').textContent = texto;
        aviso.show();
    };

    // Quita la tarjeta del lote del catálogo (o desactiva el botón en la página de detalle)
    const retirarLote = (form, textoBoton) => {
        const tarjeta = form.closest('[data-tarjeta-lote]');
        if (tarjeta) {
            tarjeta.classList.add('vendida');
            setTimeout(() => {
                tarjeta.remove();
                const vacio = document.getElementById('catalogoVacio');
                if (vacio && !document.querySelector('[data-tarjeta-lote]')) vacio.hidden = false;
            }, 350);
            return;
        }
        const boton = form.querySelector('button[type="submit"]');
        boton.disabled = true;
        boton.innerHTML = `<i class="icon-circle-check" aria-hidden="true"></i>${textoBoton}`;
    };

    document.querySelectorAll('form[data-compra]').forEach((form) => {
        form.addEventListener('submit', (e) => {
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

    confirmar.addEventListener('click', async () => {
        if (!pendiente) return;
        const form = pendiente;
        confirmar.disabled = true; // evita el doble envío
        try {
            const respuesta = await fetch(form.action, {
                method: 'POST',
                headers: { 'X-Requested-With': 'fetch', Accept: 'application/json' },
                body: new URLSearchParams(new FormData(form)),
                credentials: 'same-origin'
            });
            const datos = respuesta.headers.get('content-type')?.includes('application/json') ? await respuesta.json() : null;
            modal.hide();
            if (datos?.ok) {
                comprados += 1;
                retirarLote(form, 'Lote comprado');
                const extra = comprados > 1 ? ` Llevas ${comprados} lotes comprados en esta visita.` : '';
                mostrarAviso(true, `Compraste el lote ${datos.lote}`, `${datos.mensaje}${extra}`);
            } else if (datos) {
                retirarLote(form, 'No disponible');
                mostrarAviso(false, 'No se pudo comprar', datos.mensaje || 'Este lote ya no está disponible.');
            } else if (respuesta.redirected || respuesta.status === 401) {
                window.location.href = '/login'; // la sesión caducó
            } else {
                mostrarAviso(false, 'No se pudo comprar', 'Ocurrió un problema. Recarga la página e inténtalo de nuevo.');
            }
        } catch {
            modal.hide();
            mostrarAviso(false, 'Sin conexión', 'No se pudo enviar la compra. Revisa tu conexión e inténtalo de nuevo.');
        } finally {
            pendiente = null;
        }
    });
})();
