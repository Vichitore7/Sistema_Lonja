# Sistema Lonja de Veracruz

Aplicación web para administrar la venta de producto del mar en una lonja. Permite registrar los lotes que llegan (kilos, cajas, precio de salida y las especies que contienen), vender cada lote completo a un comprador registrado en una venta presencial, y generar el reporte diario de compras en pantalla y en PDF.

Proyecto de la materia Programación Web 2.

Autores:

- Victor Federico Caldera Arellano
- Alejandra Naomi Muciño Hernández

## Contenido

1. [Qué hace el sistema](#qué-hace-el-sistema)
2. [Tecnologías](#tecnologías)
3. [Requisitos previos](#requisitos-previos)
4. [Instalación desde cero](#instalación-desde-cero)
5. [Uso diario](#uso-diario)
6. [Variables de entorno](#variables-de-entorno)
7. [Scripts disponibles](#scripts-disponibles)
8. [Solución de problemas](#solución-de-problemas)
9. [Roles y permisos](#roles-y-permisos)
10. [Modelo de datos](#modelo-de-datos)
11. [Estructura del proyecto](#estructura-del-proyecto)
12. [Seguridad](#seguridad)
13. [Rutas principales](#rutas-principales)
14. [Flujo de trabajo con Git](#flujo-de-trabajo-con-git)
15. [Licencia](#licencia)

## Qué hace el sistema

El flujo de trabajo de la lonja es el siguiente:

1. **Inicio de sesión.** Solo entran usuarios creados por el administrador; no hay registro público.
2. **Tipos.** El administrador define las categorías de producto (por ejemplo: Pescado, Crustáceo, Molusco).
3. **Lotes.** El administrador registra cada lote que llega con sus kilos, número de cajas, precio por kilo de salida y una o varias especies (nombre, tipo e imagen opcional). Un lote puede estar DISPONIBLE, VENDIDO o RETIRADO.
4. **Inventario.** Administradores y empleados consultan los lotes disponibles y su detalle.
5. **Compradores.** Se registran los compradores (nombre, apellidos, dirección y correo). El sistema les asigna un código automático con el que se les busca al momento de vender.
6. **Compras.** Se vende un lote completo a un comprador indicando el precio final por kilo. El sistema calcula el total (kilos del lote por precio final), registra la compra y marca el lote como VENDIDO. Un lote no puede venderse dos veces.
7. **Historial.** Lista de todas las compras con su detalle.
8. **Reporte diario.** Resumen de las compras de una fecha, que se puede ver en pantalla o descargar en PDF.
9. **Usuarios.** El administrador crea, edita y desactiva cuentas de empleados.

## Tecnologías

- Node.js 20 y Express 5
- EJS (plantillas del lado del servidor)
- MariaDB con Sequelize (ORM)
- Bootstrap 5, iconos Lucide y fuentes Poppins e Inter, todo servido localmente
- bcryptjs (contraseñas) y jsonwebtoken (sesión en cookie HttpOnly)
- express-validator, multer (subida de imágenes), PDFKit (reportes PDF), helmet (cabeceras seguras)
- nodemon (recarga automática en desarrollo)

## Requisitos previos

Antes de empezar se necesita tener instalado:

| Programa | Versión | Para qué |
|---|---|---|
| Git | cualquiera reciente | Descargar el repositorio |
| Node.js | 20 o superior (incluye npm) | Ejecutar el servidor |
| MariaDB | 10.6 o superior | Base de datos |

### Instalar en Linux Mint (también funciona en Ubuntu y Debian)

Abrir la Terminal (menú > Terminal) y ejecutar:

```bash
sudo apt update
sudo apt install -y git mariadb-server
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo systemctl enable --now mariadb
```

### Instalar en Windows

1. Git: descargar de https://git-scm.com/download/win e instalar con las opciones por defecto.
2. Node.js: descargar la versión LTS (20 o superior) de https://nodejs.org e instalar.
3. MariaDB: descargar de https://mariadb.org/download/ e instalar. Durante la instalación se pide una contraseña para el usuario `root`; hay que anotarla. Dejar marcada la opción de instalarlo como servicio.

### Instalar en macOS

```bash
brew install git node@20 mariadb
brew services start mariadb
```

### Comprobar la instalación

```bash
git --version
node -v      # debe mostrar v20.x o superior
npm -v
mariadb --version
```

## Instalación desde cero

### 1. Clonar el repositorio

```bash
git clone https://github.com/Vichitore7/Sistema_Lonja.git
cd Sistema_Lonja
```

### 2. Instalar las dependencias

```bash
npm install
```

Esto crea la carpeta `node_modules`, que no se sube al repositorio.

### 3. Crear la base de datos y un usuario de MariaDB

Entrar a MariaDB como administrador:

```bash
sudo mariadb          # Linux
mariadb -u root -p    # Windows o macOS (pide la contraseña de root)
```

Ejecutar lo siguiente, cambiando `lonja_user` y `una_clave_segura` por los valores que se quieran usar:

```sql
CREATE DATABASE lonja_veracruz_2026 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lonja_user'@'localhost' IDENTIFIED BY 'una_clave_segura';
GRANT ALL PRIVILEGES ON lonja_veracruz_2026.* TO 'lonja_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Si el usuario de MariaDB tiene permiso para crear bases de datos, el paso 5 crea la base automáticamente; aun así, hacerlo manualmente evita problemas de permisos.

### 4. Configurar el archivo `.env`

Copiar la plantilla:

```bash
cp .env.example .env        # Linux o macOS
copy .env.example .env      # Windows (cmd)
```

Abrir `.env` con un editor y llenar los datos. Como mínimo hay que cambiar:

- `BD_USUARIO` y `BD_CLAVE`: el usuario y la contraseña creados en el paso 3.
- `SC_JWT`: una cadena larga y aleatoria. Se puede generar con:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `ADMIN_USER` y `ADMIN_PASSWORD`: el usuario y la contraseña del administrador inicial. La contraseña debe tener al menos 8 caracteres.

El archivo `.env` contiene contraseñas y nunca se sube a GitHub (está en `.gitignore`).

### 5. Instalar la base de datos

```bash
npm run instalar
```

Este comando:

1. Crea la base de datos si no existe.
2. Crea las 6 tablas que falten. Nunca borra ni modifica tablas o datos existentes, por lo que es seguro ejecutarlo más de una vez.
3. Crea el administrador inicial con `ADMIN_USER` y `ADMIN_PASSWORD`, solo si todavía no hay ningún administrador.

### 6. Cargar datos de prueba (opcional)

```bash
npm run datos:prueba
```

Inserta 3 tipos, 5 lotes con sus especies, 2 compradores, 1 compra de ejemplo y el usuario empleado `empleado01` con contraseña `empleado123`. Solo se ejecuta si la tabla de lotes está vacía, así que no afecta datos reales.

### 7. Iniciar el servidor

```bash
npm run server     # desarrollo: se reinicia solo al guardar cambios
npm start          # producción o uso normal
```

Abrir en el navegador http://localhost:2800 e iniciar sesión con el administrador del paso 4.

Si en la terminal aparece `Conexión a MariaDB correcta`, todo quedó funcionando.

## Uso diario

Una vez instalado, para volver a trabajar solo hace falta:

```bash
cd Sistema_Lonja
git pull           # traer los últimos cambios
npm install        # solo si cambió package.json
npm run server
```

MariaDB debe estar en ejecución. En Linux se puede revisar con `sudo systemctl status mariadb`.

## Variables de entorno

| Variable | Ejemplo | Descripción |
|---|---|---|
| `BD_NOMBRE` | `lonja_veracruz_2026` | Nombre de la base de datos (solo letras, números y guion bajo) |
| `BD_USUARIO` | `lonja_user` | Usuario de MariaDB |
| `BD_CLAVE` | `una_clave_segura` | Contraseña del usuario de MariaDB |
| `BD_DIALEC` | `mariadb` | Motor de base de datos para Sequelize |
| `BD_HOST` | `127.0.0.1` | Servidor de MariaDB |
| `BD_PORT` | `3306` | Puerto de MariaDB |
| `URL_BACKEND` | `http://localhost` | URL base que se muestra al iniciar |
| `PORT_BACKEND` | `2800` | Puerto del servidor web |
| `SC_JWT` | cadena aleatoria larga | Clave para firmar las sesiones |
| `JWT_EXPIRA` | `8h` | Duración de la sesión |
| `ADMIN_USER` | `admin` | Usuario del administrador inicial |
| `ADMIN_PASSWORD` | mínimo 8 caracteres | Contraseña del administrador inicial |

## Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm run instalar` | Crea la base de datos, las tablas y el administrador inicial |
| `npm run datos:prueba` | Inserta datos de ejemplo si no hay lotes |
| `npm run server` | Inicia el servidor con nodemon (desarrollo) |
| `npm start` | Inicia el servidor con node |

## Solución de problemas

| Mensaje o síntoma | Causa probable y solución |
|---|---|
| `No se pudo conectar a MariaDB` | MariaDB no está encendido o los datos de `.env` son incorrectos. Iniciar el servicio y revisar `BD_USUARIO`, `BD_CLAVE`, `BD_HOST` y `BD_PORT`. |
| `Access denied for user` | Usuario o contraseña de MariaDB incorrectos, o faltó el `GRANT` del paso 3. |
| `Access denied ... to database` al ejecutar `npm run instalar` | El usuario no puede crear bases de datos. Crear la base manualmente como en el paso 3. |
| `BD_NOMBRE inválido en .env` | El nombre de la base contiene espacios o caracteres especiales. |
| `Define ADMIN_USER y ADMIN_PASSWORD` | Faltan esos datos en `.env` o la contraseña tiene menos de 8 caracteres. |
| `EADDRINUSE` | El puerto 2800 ya está ocupado. Cerrar el otro proceso o cambiar `PORT_BACKEND`. |
| No se puede iniciar sesión tras varios intentos | Se bloquea por 15 minutos después de 5 intentos fallidos. Esperar o reiniciar el servidor. |
| Error de sintaxis al iniciar | La versión de Node.js es menor a 20. Revisar con `node -v`. |

## Roles y permisos

| Módulo | Administrador | Empleado |
|---|---|---|
| Inicio de sesión, cierre de sesión y panel | Sí | Sí |
| Inventario y detalle de lotes | Sí | Sí (solo lectura) |
| Lotes: crear, editar y retirar, con sus especies | Sí | No |
| Tipos | Sí | No |
| Compradores: buscar por código, alta y edición | Sí | Sí |
| Registrar compra e historial | Sí | Sí |
| Reporte diario y PDF | Sí | Sí |
| Usuarios (solo cuentas de empleado) | Sí | No |

Si un empleado intenta entrar a un módulo que no le corresponde, el sistema responde con una pantalla de acceso denegado (403).

## Modelo de datos

La base de datos tiene 6 tablas:

- **lote**: `id_lte`, `kilos`, `numero_cajas`, `precio_kilo_salida`, `fecha`, `estado` (DISPONIBLE, VENDIDO o RETIRADO).
- **especie**: `id_epe`, `nombre`, `id_lte` (lote al que pertenece), `id_tpo` (tipo), `imagen` (opcional). Se capturan dentro del formulario de lote.
- **tipo**: `id_tpo`, `nombre`.
- **comprador**: `codigo_cpr` (automático), `nombre`, `apellido_paterno`, `apellido_materno`, `direccion`, `correo`.
- **compra**: `id_cmp`, `codigo_cpr`, `precio_kilo_final`, `precio_total`, `fecha`, `id_lte` (único: un lote se vende una sola vez).
- **usuario**: `id_usuario`, `nombre_usuario` (único), `password` (cifrada con bcrypt), `rol` (ADMINISTRADOR o EMPLEADO), `activo`.

La venta (`services/ventaService.js`) registra la compra y cambia el lote a VENDIDO dentro de una sola transacción. Bloquea la fila del lote mientras tanto y la restricción única sobre `id_lte` impide ventas dobles. El total siempre se calcula en el servidor como kilos del lote por precio final por kilo.

## Estructura del proyecto

```
config/        db.js (conexión), instalar.js, datosPrueba.js
controllers/   lógica de cada módulo: auth, dashboard, inventario, lote, tipo,
               comprador, compra, reporte, usuario
models/        modelos de Sequelize y sus relaciones (index.js)
routes/        rutas de Express de cada módulo
middleware/    autenticar, autorizarRol, validar, errores, seguridad (CSRF y límite de login)
services/      ventaService, reporteService, loteService
helpers/       formatos, mensajes, utilidades, tokens, imagenes, reportePdf
views/         plantillas EJS por módulo y partials compartidos
public/        css, js, img, vendor/bootstrap, uploads/especies (imágenes subidas)
index.js       punto de entrada del servidor
```

## Seguridad

- Sesión con JWT en cookie HttpOnly (`SameSite=Lax`, `Secure` en producción). En cada petición se vuelve a consultar al usuario, así que un empleado desactivado pierde el acceso de inmediato.
- Roles verificados en el servidor.
- Token CSRF en todos los formularios.
- Límite de 5 intentos de inicio de sesión cada 15 minutos, con mensaje de error genérico.
- Validación de datos con express-validator, consultas parametrizadas con Sequelize y salida escapada en EJS.
- Imágenes JPG, PNG o WEBP de hasta 2 MB, validando extensión, tipo MIME y firma del archivo; se guardan con un nombre generado.
- Cabeceras seguras con helmet; los errores no muestran detalles internos al usuario.

## Rutas principales

| Ruta | Descripción |
|---|---|
| `/login` | Inicio de sesión |
| `/dashboard` | Panel principal |
| `/inventario` | Lotes disponibles |
| `/lotes`, `/lotes/nuevo`, `/lotes/:id`, `/lotes/:id/editar`, `/lotes/:id/retirar` | Administración de lotes |
| `/tipos` | Tipos de producto |
| `/compradores` | Compradores |
| `/compras/nueva`, `/compras/historial`, `/compras/:id` | Ventas |
| `/reportes`, `/reportes/diario?fecha=`, `/reportes/diario/pdf?fecha=` | Reportes |
| `/usuarios` | Cuentas de empleados |

## Flujo de trabajo con Git

El repositorio tiene tres ramas:

- `main`: versión estable. Ambos integrantes pueden subir cambios directamente; está protegida para que no se pueda borrar ni sobrescribir su historial (force push).
- `Victor` y `Alejandra`: rama de trabajo de cada integrante.

Para trabajar en la rama propia:

```bash
git checkout Alejandra          # o Victor
git pull origin main            # traer lo último de main
# ... hacer cambios ...
git add .
git commit -m "Descripción del cambio"
git push
```

Para pasar los cambios de la rama propia a `main`:

```bash
git checkout main
git pull
git merge Alejandra             # o Victor
git push
```

También se puede trabajar directamente en `main` con `git pull` antes de empezar y `git push` al terminar.

## Licencia

Distribuido bajo la licencia MIT. Ver el archivo [LICENSE](LICENSE).

Copyright (c) 2026 Victor Federico Caldera Arellano y Alejandra Naomi Muciño Hernández.
