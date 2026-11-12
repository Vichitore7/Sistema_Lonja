# Sistema Lonja de Veracruz

Proyecto de **Programación Web 2** (equipo de 2 integrantes, entrega 12/11/2026).
Registra lotes de producto, la venta presencial de cada lote completo a un comprador y genera el **reporte diario de compras** (en pantalla y en PDF).

La referencia vigente es el *Manual integral* (10/11/2026) y el *Catálogo visual de pantallas*.

## Tecnologías

Node.js 20 · Express 5 · EJS · Bootstrap 5 (local) · MariaDB + Sequelize · bcryptjs · jsonwebtoken (cookie HttpOnly `_token`) · cookie-parser · express-validator · multer · PDFKit · helmet · Lucide (iconos) · Poppins/Inter (fuentes locales) · nodemon.

## Instalación

```bash
npm install
cp .env.example .env          # y escribe tus datos de MariaDB, SC_JWT y el administrador inicial
npm run instalar              # crea la BD (si tu usuario puede), las 6 tablas y el administrador inicial
npm run datos:prueba          # (opcional) tipos, lotes, compradores, una compra y empleado01
npm run server                # http://localhost:2800
```

Si tu usuario de MariaDB no puede crear bases, créala una vez como root:

```sql
CREATE DATABASE lonja_veracruz_2026 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON lonja_veracruz_2026.* TO 'tu_usuario'@'localhost';
```

`npm run instalar` usa `sync()` **sin** `force` ni `alter`: solo crea tablas que no existen y nunca borra datos.

## Roles

| Módulo | Administrador | Empleado |
|---|---|---|
| Login, logout, panel | Sí | Sí |
| Inventario y detalle de lotes | Sí | Sí (lectura) |
| Lotes (crear/editar/retirar) con sus especies | Sí | No (403) |
| Tipos | Sí | No (403) |
| Compradores (buscar por código, alta, edición) | Sí | Sí |
| Registrar compra e historial | Sí | Sí |
| Reportes diarios y PDF | Sí | Sí |
| Usuarios (solo cuentas EMPLEADO) | Sí | No (403) |

No existe registro público ni cuentas de compradores. El administrador inicial se crea con `npm run instalar`.

## Modelo de datos (6 tablas)

- **lote**: `id_lte`, `kilos`, `numero_cajas`, `precio_kilo_salida`, `fecha`, `estado` (DISPONIBLE / VENDIDO / RETIRADO).
- **especie**: `id_epe`, `nombre`, `id_lte` (FK), `id_tpo` (FK), `imagen` (nombre de archivo, opcional). Se capturan dentro de *Nuevo lote*; no hay menú Especies.
- **tipo**: `id_tpo`, `nombre`.
- **comprador**: `codigo_cpr` (automático), `nombre`, `apellido_paterno`, `apellido_materno`, `direccion`, `correo`.
- **compra**: `id_cmp`, `codigo_cpr` (FK), `precio_kilo_final`, `precio_total`, `fecha`, `id_lte` (FK **UNIQUE**: un lote se vende una sola vez).
- **usuario** (añadida): `id_usuario`, `nombre_usuario` (único), `password` (bcrypt), `rol`, `activo`.

La venta (`services/ventaService.js`) crea la compra y cambia el lote a VENDIDO en **una transacción**, con bloqueo de la fila del lote y la restricción UNIQUE como última barrera contra ventas dobles. El total siempre se recalcula en el servidor: `kilos del lote × precio final/kg`.

## Estructura

```
config/        db.js, instalar.js, datosPrueba.js
controllers/   auth, dashboard, inventario, lote, tipo, comprador, compra, reporte, usuario
models/        index.js (relaciones), Lote, Especie, Tipo, Comprador, Compra, Usuario
routes/        authRouter, dashboardRouter, inventarioRouter, loteRouter, tipoRouter,
               compradorRouter, compraRouter, reporteRouter, usuarioRouter
middleware/    autenticar, autorizarRol, validar, errores, seguridad (CSRF y límite de login)
services/      ventaService, reporteService, loteService (consulta compartida Inventario/Lotes)
helpers/       formatos, mensajes, utilidades, tokens, imagenes, reportePdf
views/         auth, dashboard, inventario, lotes, tipos, compradores, compras, reportes,
               usuarios, errores, partials (head, sidebar, header, alerts, footer, …)
public/        css, js, img, uploads/especies, vendor/bootstrap
```

## Seguridad aplicada

- JWT en cookie HttpOnly (`SameSite=Lax`, `Secure` en producción); en cada petición se vuelve a consultar al usuario (un empleado desactivado pierde el acceso de inmediato).
- Roles verificados en el servidor (`autorizarRol`); respuesta 403 con pantalla de acceso denegado.
- Token CSRF en todos los formularios POST (`middleware/seguridad.js`).
- Límite de 5 intentos de login por 15 minutos y mensaje genérico de error.
- Validación con express-validator; consultas parametrizadas con Sequelize; salida escapada en EJS.
- Imágenes: JPG/PNG/WEBP hasta 2 MB, validando extensión, MIME y firma del archivo; nombre generado.
- Cabeceras seguras con helmet; sin stacktraces al usuario.

## Rutas principales

`/login`, `/dashboard`, `/inventario`, `/lotes` (`/nuevo`, `/:id`, `/:id/editar`, `/:id/retirar`), `/tipos`, `/compradores`, `/compras/nueva`, `/compras/historial`, `/compras/:id`, `/reportes`, `/reportes/diario?fecha=`, `/reportes/diario/pdf?fecha=`, `/usuarios`.
