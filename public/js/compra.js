// Registrar compra: búsqueda de comprador por código, datos del lote, total y confirmación
(() => {
    const lotes = JSON.parse(document.getElementById('datosLotes').textContent);
    const form = document.getElementById('formCompra');
    const inpCodigo = document.getElementById('codigo_cpr');
    const resultado = document.getElementById('resultadoComprador');
    const selLote = document.getElementById('id_lte');
    const inpPrecio = document.getElementById('precio_kilo_final');
    const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    const numero = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const folio = (n) => String(n).padStart(3, '0');
    let compradorValido = resultado.querySelector('.icon-circle-check') ? resultado.textContent : null;

    // Igual que en el servidor: centavos para evitar errores de redondeo
    const total = (kilos, precio) => Math.round((Math.round(kilos * 100) * Math.round(precio * 100)) / 100) / 100;

    const pintarResultado = (ok, html) => {
        resultado.hidden = false;
        resultado.classList.toggle('error', !ok);
        resultado.innerHTML = `<i class="icon-${ok ? 'circle-check' : 'circle-alert'}" aria-hidden="true"></i><div>${html}</div>`;
    };
    const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const buscarComprador = async () => {
        const codigo = inpCodigo.value.trim().replace(/^0+(?=\d)/, '');
        compradorValido = null;
        if (!/^\d{1,9}$/.test(codigo) || Number(codigo) === 0) return pintarResultado(false, 'Escribe un código numérico válido.');
        try {
            const resp = await fetch(`/compradores/${codigo}`, { headers: { Accept: 'application/json' } });
            if (resp.status === 404) return pintarResultado(false, 'No existe un comprador con ese código. Puedes registrarlo con “Nuevo comprador”.');
            if (!resp.ok) throw new Error();
            const datos = await resp.json();
            compradorValido = datos.nombre;
            pintarResultado(true, `<strong>Comprador encontrado</strong><br>Código: ${folio(datos.codigo_cpr)}<br>Nombre: ${escapar(datos.nombre)}`);
        } catch {
            pintarResultado(false, 'No se pudo consultar el comprador. Inténtalo de nuevo.');
        }
    };

    document.getElementById('buscarComprador').addEventListener('click', buscarComprador);
    inpCodigo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); buscarComprador(); } });
    inpCodigo.addEventListener('input', () => { compradorValido = null; });

    const loteSeleccionado = () => lotes.find((l) => String(l.id_lte) === selLote.value);

    const actualizarLote = () => {
        const l = loteSeleccionado();
        document.getElementById('loteKilos').textContent = l ? `${numero.format(l.kilos)} kg` : '—';
        document.getElementById('loteCajas').textContent = l ? l.numero_cajas : '—';
        document.getElementById('lotePrecio').textContent = l ? `${moneda.format(l.precio_kilo_salida)} / kg` : '—';
        const cuerpo = document.getElementById('loteEspecies');
        cuerpo.innerHTML = '';
        if (!l) {
            cuerpo.innerHTML = '<tr class="vacio"><td colspan="2">Selecciona un lote para ver sus especies.</td></tr>';
        } else {
            l.especies.forEach((es) => {
                const tr = document.createElement('tr');
                const tdTipo = document.createElement('td'); tdTipo.textContent = es.tipo;
                const tdNombre = document.createElement('td'); tdNombre.textContent = es.nombre;
                tr.append(tdTipo, tdNombre);
                cuerpo.append(tr);
            });
        }
        actualizarTotal();
    };

    const actualizarTotal = () => {
        const l = loteSeleccionado();
        const precio = Number(inpPrecio.value);
        document.getElementById('importeTotal').textContent = moneda.format(l && precio > 0 ? total(l.kilos, precio) : 0);
    };

    selLote.addEventListener('change', actualizarLote);
    inpPrecio.addEventListener('input', actualizarTotal);
    actualizarLote();

    // Resumen y confirmación antes de enviar
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmar'));
    let confirmado = false;
    form.addEventListener('submit', (e) => {
        if (confirmado) return;
        e.preventDefault();
        const l = loteSeleccionado();
        const precio = Number(inpPrecio.value);
        if (!compradorValido) { buscarComprador(); inpCodigo.focus(); return; }
        if (!l) { selLote.focus(); return; }
        if (!(precio > 0)) { inpPrecio.focus(); return; }
        const resumen = document.getElementById('resumenCompra');
        const filas = [
            ['Comprador', `${folio(inpCodigo.value.trim().replace(/^0+(?=\d)/, ''))} — ${compradorValido.replace(/^.*Nombre: /s, '')}`],
            ['Lote', `${folio(l.id_lte)} (${l.especies.map((es) => es.nombre).join(', ')})`],
            ['Kilogramos', `${numero.format(l.kilos)} kg`],
            ['Precio final', `${moneda.format(precio)} / kg`],
            ['Importe total', moneda.format(total(l.kilos, precio))]
        ];
        resumen.innerHTML = '';
        filas.forEach(([dt, dd]) => {
            const t = document.createElement('dt'); t.textContent = `${dt}:`;
            const d = document.createElement('dd'); d.textContent = dd;
            resumen.append(t, d);
        });
        modal.show();
    });
    document.getElementById('confirmarCompra').addEventListener('click', () => {
        confirmado = true;
        form.submit();
    });
})();
