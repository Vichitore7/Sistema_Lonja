#!/bin/bash
# READ: muestra un tipo por su id
# Uso: ./ver.sh 1
source "$(dirname "$0")/comun.sh"
[ -z "$1" ] && { echo "Uso: $0 <id>"; exit 1; }

echo "GET $API/tipos/$1"
curl -s -w "\nHTTP %{http_code}\n" -X GET "$API/tipos/$1" -H "Authorization: Bearer $TOKEN"
