#!/bin/bash
# Demostración del CRUD completo de la tabla "tipo" con curl:
# crear -> listar -> ver -> modificar -> casos de error -> eliminar
# Uso: ./crud_completo.sh
source "$(dirname "$0")/comun.sh"
AUTH="Authorization: Bearer $TOKEN"
JSON="Content-Type: application/json"
NOMBRE="Prueba curl $(date +%H%M%S)"

titulo() { echo; echo "=============== $1 ==============="; }

titulo "1. CREATE  POST /tipos"
RESPUESTA=$(curl -s -X POST "$API/tipos" -H "$AUTH" -H "$JSON" -d "{\"nombre\":\"$NOMBRE\"}")
echo "$RESPUESTA" | bonito
ID=$(echo "$RESPUESTA" | node -pe 'JSON.parse(require("fs").readFileSync(0)).id_tpo')
echo "-> id creado: $ID"

titulo "2. READ  GET /tipos?todos=1"
curl -s "$API/tipos?todos=1" -H "$AUTH" | bonito

titulo "3. READ  GET /tipos/$ID"
curl -s "$API/tipos/$ID" -H "$AUTH" | bonito

titulo "4. UPDATE  PUT /tipos/$ID"
curl -s -X PUT "$API/tipos/$ID" -H "$AUTH" -H "$JSON" -d "{\"nombre\":\"$NOMBRE (modificado)\"}" | bonito

titulo "5. Error: nombre repetido (400)"
curl -s -w "HTTP %{http_code}\n" -X POST "$API/tipos" -H "$AUTH" -H "$JSON" -d "{\"nombre\":\"$NOMBRE (modificado)\"}"

titulo "6. Error: nombre vacío (400)"
curl -s -w "HTTP %{http_code}\n" -X POST "$API/tipos" -H "$AUTH" -H "$JSON" -d '{"nombre":""}'

titulo "7. Error: sin token (401)"
curl -s -w "HTTP %{http_code}\n" "$API/tipos"

titulo "8. Error: borrar un tipo que usan especies (409)"
curl -s -w "HTTP %{http_code}\n" -X DELETE "$API/tipos/1" -H "$AUTH"

titulo "9. DELETE  DELETE /tipos/$ID"
curl -s -X DELETE "$API/tipos/$ID" -H "$AUTH" | bonito

titulo "10. Ya no existe: GET /tipos/$ID (404)"
curl -s -w "HTTP %{http_code}\n" "$API/tipos/$ID" -H "$AUTH"
