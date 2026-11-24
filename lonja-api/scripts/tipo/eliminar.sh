#!/bin/bash
# DELETE: borra un tipo (la API no lo permite si alguna especie lo usa)
# Uso: ./eliminar.sh 4
source "$(dirname "$0")/comun.sh"
[ -z "$1" ] && { echo "Uso: $0 <id>"; exit 1; }

echo "DELETE $API/tipos/$1"
curl -s -w "\nHTTP %{http_code}\n" -X DELETE "$API/tipos/$1" -H "Authorization: Bearer $TOKEN"
