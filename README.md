# Sistema Lonja de Veracruz

Aplicación web para administrar la venta de producto del mar en una lonja. Permite registrar los lotes que llegan (kilos, cajas, precio de salida y las especies que contienen), ponerlos a la venta con un precio final fijado por el administrador, que los compradores registrados los compren completos en línea y generar reportes de compras por rango de fechas, en pantalla y en PDF.

Versión 2.0: sigue el «Manual integral actualizado» del 12/11/2026 (cuentas de compradores y ventas en línea).

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

1. **Inicio de sesión y registro.** El personal (administrador y empleados) usa cuentas creadas por el administrador. Los compradores crean su propia cuenta en `/registro` (datos personales, usuario y contraseña), sin aprobación previa, y entran por el mismo inicio de sesión. El registro siempre crea rol COMPRADOR; no existe registro público de personal.
2. **Tipos.** El administrador define las categorías de producto (por ejemplo: Pescado, Crustáceo, Molusco).
3. **Lotes.** El administrador registra cada lote con sus kilos, número de cajas, fecha, precio por kilo de salida y una o varias especies (nombre, tipo e imagen opcional). Un lote nuevo inicia DISPONIBLE y sin publicar.
4. **Gestión de ventas (publicación).** El administrador elige un lote disponible y define su `precio_kilo_final`. Ve el valor de salida, el total de la oferta (kilos × precio final) y la diferencia estimada antes de confirmar «Poner a la venta». Publicar **no** crea una compra: solo guarda el precio final y marca el lote como publicado. Puede retirarlo del catálogo mientras siga disponible.
5. **Catálogo.** El comprador ve los lotes publicados y disponibles con kilos, cajas, fecha, especies y el **precio total**. Nunca ve el precio de salida ni el precio final por kilo.
6. **Compra inmediata.** El comprador confirma la compra del lote completo. El servidor toma el precio de MariaDB, crea la compra y marca el lote como VENDIDO en una sola transacción. Un lote solo se puede comprar una vez.
7. **Mis compras.** Cada comprador consulta únicamente su propio historial y el detalle de sus compras.
8. **Inventario e historial interno.** Administradores y empleados consultan lotes y compras (el empleado, solo lectura).
9. **Reportes.** Se elige un intervalo de fechas (inclusive) y se obtienen compras, lotes, kilos e ingresos, en pantalla o en PDF.
10. **Cuentas.** El administrador gestiona las cuentas de empleados (crear, editar, activar/desactivar) y de compradores (buscar por código, consultar, editar datos y activar/desactivar).

### Ciclo de vida de un lote

| Etapa | publicado | estado | precio_kilo_final | Compra |
|---|---|---|---|---|
| Registrado | FALSE | DISPONIBLE | NULL | No existe |
| En venta | TRUE | DISPONIBLE | > 0 | No existe |
| Vendido | TRUE (histórico) | VENDIDO | Conservado | Existe una |
| Retirado | FALSE | RETIRADO | Conservado si hubo publicación | No |

Ejemplo: 100 kg, precio de salida $80/kg y precio final $120/kg → valor de salida $8,000, total de la oferta $12,000 y diferencia estimada +$4,000 (no es utilidad neta).

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
3. Aplica la migración `config/migrar.js` a bases que ya existían (ver [Migrar una base existente](#migrar-una-base-existente)).
4. Crea el administrador inicial con `ADMIN_USER` y `ADMIN_PASSWORD`, solo si todavía no hay ningún administrador.

### 6. Cargar datos de prueba (opcional)

```bash
npm run datos:prueba
```

Inserta 3 tipos, 5 lotes con sus especies (3 de ellos publicados), 2 compradores, 1 compra hecha desde el catálogo, el usuario empleado `empleado01` (contraseña `empleado123`) y el usuario comprador `comprador01` (contraseña `comprador123`). Solo se ejecuta si la tabla de lotes está vacía, así que no afecta datos reales.

Para probar los reportes por rango de fechas también hay datos con fechas pasadas:

```bash
npm run datos:historicos
```

Agrega 15 lotes registrados entre el 01/10/2026 y el 11/11/2026: 11 vendidos en distintos días (uno a las 23:50, para probar el límite del rango), 2 a la venta, 1 sin publicar y 1 retirado. También agrega 4 compradores con cuenta (`comprador_hist1` a `comprador_hist4`, contraseña `comprador123`). Se puede ejecutar sobre una base que ya tiene datos: no modifica ni borra nada y solo se carga una vez.

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
| `npm run datos:historicos` | Agrega lotes y compras con fechas pasadas (octubre y noviembre de 2026) |
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

| Función | Administrador | Empleado | Comprador |
|---|---|---|---|
| Inicio y cierre de sesión | Sí | Sí | Sí |
| Registro público (`/registro`) | No | No | Sí |
| Panel e inventario interno | Sí | Lectura | No |
| Crear, editar y retirar lotes | Sí | No | No |
| Tipos y especies dentro de los lotes | Sí | No | No |
| Publicar lotes y definir precios (Gestión de ventas) | Sí | No | No |
| Catálogo de ofertas y comprar un lote | No | No | Sí |
| Mis compras | No | No | Sí |
| Historial interno de compras y reportes PDF | Sí | Sí | No |
| Administrar empleados y compradores | Sí | No | No |

Si alguien intenta entrar a un módulo que no le corresponde, el sistema responde con una pantalla de acceso denegado (403). La captura manual de compras del sistema anterior (`/compras/nueva`) se retiró: las compras solo se crean cuando un comprador adquiere un lote publicado, así nadie puede saltarse el precio final fijado por el administrador.

## Modelo de datos

La base de datos tiene 6 tablas:

- **lote**: `id_lte`, `kilos`, `numero_cajas`, `precio_kilo_salida`, `fecha`, `estado` (DISPONIBLE, VENDIDO o RETIRADO), `publicado` (nuevo, BOOLEAN, por defecto FALSE) y `precio_kilo_final` (nuevo, DECIMAL(10,2), NULL hasta publicar). El total de la oferta se calcula; no se guarda.
- **especie**: `id_epe`, `nombre`, `id_lte` (lote al que pertenece), `id_tpo` (tipo), `imagen` (opcional). Se capturan dentro del formulario de lote. Sin cambios.
- **tipo**: `id_tpo`, `nombre`. Sin cambios.
- **comprador**: `codigo_cpr` (automático), `nombre`, `apellido_paterno`, `apellido_materno`, `direccion`, `correo`. Sin cambios (no lleva contraseña).
- **compra**: `id_cmp`, `codigo_cpr`, `id_lte` (único: un lote se vende una sola vez), `precio_kilo_final`, `precio_total`, `fecha` (fecha real de la compra). Sin cambios.
- **usuario**: `id_usuario`, `nombre_usuario` (único), `password` (bcrypt), `rol` (ADMINISTRADOR, EMPLEADO o COMPRADOR), `activo`, `codigo_cpr` (FK única a `comprador`; obligatoria para COMPRADOR y NULL para el personal).

No se agregó ninguna tabla. La compra (`services/ventaService.js`) bloquea la fila del lote (`SELECT ... FOR UPDATE`), vuelve a comprobar que esté DISPONIBLE, publicado y con precio mayor que cero, toma el comprador de la sesión y el precio de MariaDB, crea la compra y marca el lote como VENDIDO en una sola transacción. La restricción única de `compra.id_lte` es la última barrera contra la doble venta. La publicación (`services/publicacionService.js`) solo modifica `lote`.

### Migrar una base existente

1. Respaldar la base fuera del repositorio:
   ```bash
   mariadb-dump -u TU_USUARIO -p --single-transaction lonja_veracruz_2026 > ~/respaldo_lonja.sql
   ```
2. Ejecutar `npm run instalar`. `config/migrar.js` revisa el esquema real y solo agrega lo que falta: `lote.publicado` y `lote.precio_kilo_final`, el rol COMPRADOR y `usuario.codigo_cpr` (FK única), y una restricción CHECK que exige precio final mayor que cero en lotes publicados. Los lotes no vendidos quedan sin publicar; los vendidos quedan como históricos con el precio al que se vendieron. Nunca usa `sync({ force })` ni `sync({ alter })` y se puede ejecutar varias veces.
3. Si algo sale mal, restaurar: `mariadb -u TU_USUARIO -p lonja_veracruz_2026 < ~/respaldo_lonja.sql`.

La regla «COMPRADOR con `codigo_cpr`, personal sin él» no puede ser CHECK en MariaDB porque la columna tiene una FK con `ON UPDATE CASCADE`; se valida en el modelo `Usuario` y en los controladores.

## Estructura del proyecto

```
config/        db.js (conexión), instalar.js, migrar.js, datosPrueba.js, datosHistoricos.js
controllers/   lógica de cada módulo: auth, dashboard, inventario, lote, tipo,
               comprador, compra, reporte, usuario, publicacion, catalogo, misCompras
models/        modelos de Sequelize y sus relaciones (index.js)
routes/        rutas de Express de cada módulo
middleware/    autenticar, autorizarRol, validar, errores, seguridad (CSRF y límites de login, registro y compra)
services/      ventaService (compra), publicacionService, reporteService, loteService
helpers/       formatos, mensajes, utilidades, tokens, imagenes, reportePdf
views/         plantillas EJS por módulo y partials compartidos
public/        css, js, img, vendor/bootstrap, uploads/especies (imágenes subidas)
index.js       punto de entrada del servidor
```

## Seguridad

- Sesión con JWT en cookie HttpOnly (`SameSite=Lax`, `Secure` en producción). En cada petición se vuelve a consultar al usuario, así que una cuenta desactivada pierde el acceso (y la posibilidad de comprar) de inmediato. Las sesiones se invalidan al reiniciar el servidor.
- Roles verificados en el servidor.
- Token CSRF en todos los formularios.
- Límite de 5 intentos de inicio de sesión cada 15 minutos (mensaje genérico), de 10 registros por equipo cada 15 minutos y de 20 intentos de compra por cuenta cada minuto.
- La compra nunca confía en `codigo_cpr`, `precio_kilo_final` ni `precio_total` enviados por el navegador; el detalle `/mis-compras/:id` comprueba la pertenencia (IDOR).
- Las vistas del comprador no contienen precios internos ni en HTML oculto, JSON o scripts.
- Páginas privadas con `Cache-Control: no-store`.
- Validación de datos con express-validator, consultas parametrizadas con Sequelize y salida escapada en EJS.
- Imágenes JPG, PNG o WEBP de hasta 2 MB, validando extensión, tipo MIME y firma del archivo; se guardan con un nombre generado.
- Cabeceras seguras con helmet; los errores no muestran detalles internos al usuario.

## Rutas principales

| Ruta | Descripción |
|---|---|
| `/login`, `POST /logout` | Inicio y cierre de sesión |
| `/registro` | Alta de comprador (Comprador + Usuario en una transacción) |
| `/dashboard`, `/inventario` | Panel e inventario interno (A/E) |
| `/lotes`, `/lotes/nuevo`, `/lotes/:id`, `/lotes/:id/editar`, `POST /lotes/:id/retirar` | Administración de lotes (A) |
| `/tipos` | Tipos de producto (A) |
| `/ventas/administrar`, `/ventas/nueva`, `POST /ventas/publicar`, `POST /ventas/:id/despublicar` | Gestión de ventas (A) |
| `/catalogo`, `/catalogo/:id`, `POST /catalogo/:id/comprar` | Catálogo y compra inmediata (C) |
| `/mis-compras`, `/mis-compras/:id` | Historial personal (C) |
| `/compras/historial`, `/compras/:id` | Historial interno de compras (A/E) |
| `/compradores`, `/compradores/:codigo/...` | Gestión administrativa de compradores y sus cuentas (A) |
| `/usuarios` | Gestión de cuentas: empleados y compradores (A) |
| `/reportes?desde=&hasta=`, `/reportes/pdf?desde=&hasta=` | Reporte por intervalo de fechas y PDF (A/E) |

A = Administrador, E = Empleado, C = Comprador.

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
