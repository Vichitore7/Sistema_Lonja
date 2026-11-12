// Comportamiento común: menú lateral en móvil, confirmaciones y mostrar/ocultar contraseña
(() => {
    const body = document.body;
    document.querySelectorAll('[data-abrir-menu]').forEach((b) => b.addEventListener('click', () => body.classList.toggle('menu-abierto')));
    document.querySelectorAll('[data-cerrar-menu]').forEach((b) => b.addEventListener('click', () => body.classList.remove('menu-abierto')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') body.classList.remove('menu-abierto'); });

    // <form data-confirmar="¿Seguro?">
    document.querySelectorAll('form[data-confirmar]').forEach((form) => {
        form.addEventListener('submit', (e) => { if (!window.confirm(form.dataset.confirmar)) e.preventDefault(); });
    });

    // <button data-ver-password="idDelInput">
    document.querySelectorAll('[data-ver-password]').forEach((boton) => {
        boton.addEventListener('click', () => {
            const input = document.getElementById(boton.dataset.verPassword);
            const mostrar = input.type === 'password';
            input.type = mostrar ? 'text' : 'password';
            boton.querySelector('i').className = mostrar ? 'icon-eye' : 'icon-eye-off';
            boton.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
        });
    });
})();
