// Formulario Nuevo / Editar lote: lista temporal de especies (tipo, nombre, imagen opcional)
(() => {
    const lista = document.getElementById('listaEspecies');
    const filaVacia = document.getElementById('filaVacia');
    const selTipo = document.getElementById('nuevaTipo');
    const inpNombre = document.getElementById('nuevaEspecie');
    const contImagen = document.getElementById('contenedorImagen');
    const errorCaptura = document.getElementById('errorCaptura');
    const MAX_BYTES = 2 * 1024 * 1024;
    const TIPOS_OK = ['image/jpeg', 'image/png', 'image/webp'];

    let siguienteRef = Math.max(0, ...[...lista.querySelectorAll('tr[data-ref]')].map((tr) => Number(tr.dataset.ref) || 0)) + 1;

    const actualizarVacio = () => { filaVacia.hidden = lista.querySelectorAll('tr[data-ref]').length > 0; };
    const mostrarError = (msg) => { errorCaptura.textContent = msg; };

    const oculto = (nombre, valor) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = nombre;
        input.value = valor;
        return input;
    };

    const celda = (contenido) => {
        const td = document.createElement('td');
        if (typeof contenido === 'string') td.textContent = contenido; else if (contenido) td.append(...[].concat(contenido));
        return td;
    };

    document.getElementById('agregarEspecie').addEventListener('click', () => {
        mostrarError('');
        const nombre = inpNombre.value.trim();
        const inpImagen = document.getElementById('nuevaImagen');
        const archivo = inpImagen.files[0];

        if (!selTipo.value) return mostrarError('Selecciona el tipo de la especie.');
        if (!nombre) return mostrarError('Escribe el nombre de la especie.');
        if (archivo && !TIPOS_OK.includes(archivo.type)) return mostrarError('La imagen debe ser JPG, PNG o WEBP.');
        if (archivo && archivo.size > MAX_BYTES) return mostrarError('La imagen debe pesar como máximo 2 MB.');
        if (lista.querySelectorAll('tr[data-ref]').length >= 20) return mostrarError('Un lote puede tener máximo 20 especies.');

        const ref = String(siguienteRef++);
        const tr = document.createElement('tr');
        tr.dataset.ref = ref;

        // Imagen: se mueve el mismo <input type=file> a la fila (oculto) y se crea uno nuevo para la captura
        const tdImagen = celda(null);
        if (archivo) {
            const img = document.createElement('img');
            img.className = 'miniatura';
            img.alt = nombre;
            img.src = URL.createObjectURL(archivo);
            tdImagen.append(img);
            inpImagen.removeAttribute('id');
            inpImagen.name = `imagen_${ref}`;
            inpImagen.hidden = true;
            tdImagen.append(inpImagen);
            const nuevo = document.createElement('input');
            nuevo.type = 'file';
            nuevo.id = 'nuevaImagen';
            nuevo.className = 'form-control';
            nuevo.accept = TIPOS_OK.join(',');
            contImagen.append(nuevo);
        } else {
            const vacia = document.createElement('span');
            vacia.className = 'miniatura-vacia';
            vacia.title = 'Sin imagen';
            vacia.innerHTML = '<i class="icon-image" aria-hidden="true"></i>';
            tdImagen.append(vacia);
        }
        tdImagen.append(
            oculto(`especies[${ref}][ref]`, ref),
            oculto(`especies[${ref}][nombre]`, nombre),
            oculto(`especies[${ref}][id_tpo]`, selTipo.value)
        );

        const quitar = document.createElement('button');
        quitar.type = 'button';
        quitar.className = 'btn-icono peligro';
        quitar.dataset.quitarEspecie = '';
        quitar.title = 'Quitar';
        quitar.setAttribute('aria-label', `Quitar ${nombre}`);
        quitar.innerHTML = '<i class="icon-trash-2" aria-hidden="true"></i>';
        const acciones = document.createElement('div');
        acciones.className = 'acciones';
        acciones.append(quitar);

        tr.append(celda(selTipo.options[selTipo.selectedIndex].text), celda(nombre), tdImagen, celda(acciones));
        lista.insertBefore(tr, filaVacia);
        inpNombre.value = '';
        inpNombre.focus();
        actualizarVacio();
    });

    // Enter en el nombre agrega la especie en lugar de enviar el formulario
    inpNombre.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('agregarEspecie').click(); }
    });

    lista.addEventListener('click', (e) => {
        const boton = e.target.closest('[data-quitar-especie]');
        if (!boton) return;
        boton.closest('tr').remove();
        actualizarVacio();
    });

    document.getElementById('formLote').addEventListener('submit', (e) => {
        if (!lista.querySelectorAll('tr[data-ref]').length) {
            e.preventDefault();
            mostrarError('Agrega al menos una especie al lote.');
            selTipo.focus();
        }
    });
})();
