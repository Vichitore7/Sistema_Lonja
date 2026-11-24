#!/bin/bash
# Configuración compartida por los scripts del CRUD de la tabla "tipo".
# Inicia sesión como administrador y deja el token en la variable TOKEN.

API="${API:-http://localhost:2900/api}"

# Lee ADMIN_USER y ADMIN_PASSWORD del .env de lonja-api (se pueden sobreescribir al llamar el script)
ENV_FILE="$(dirname "${BASH_SOURCE[0]}")/../../.env"
if [ -f "$ENV_FILE" ]; then
    : "${ADMIN_USER:=$(grep -E '^ADMIN_USER=' "$ENV_FILE" | cut -d= -f2-)}"
    : "${ADMIN_PASSWORD:=$(grep -E '^ADMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)}"
fi

# Muestra el JSON con sangría para que se lea mejor
bonito() {
    node -e 'let t=require("fs").readFileSync(0,"utf8");try{console.log(JSON.stringify(JSON.parse(t),null,2))}catch{console.log(t)}'
}

# POST /api/auth/login -> { token }
TOKEN=$(curl -s -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"nombre_usuario\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASSWORD\"}" \
    | node -pe 'JSON.parse(require("fs").readFileSync(0)).token || ""' 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "No se pudo iniciar sesión. ¿Está corriendo la API (npm start en lonja-api)?" >&2
    exit 1
fi
