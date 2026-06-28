#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JAR="$SCRIPT_DIR/mutation-ai-studio.jar"

if [ ! -f "$JAR" ]; then
  echo "JAR nao encontrado: $JAR"
  exit 1
fi

if ! command -v java &>/dev/null; then
  echo "Java nao encontrado. Instale Java 21 ou superior."
  exit 1
fi

# Libera a porta 8081 se já estiver ocupada
fuser -k 8081/tcp 2>/dev/null || true

echo "Iniciando Mutation AI Studio na porta 8081..."
exec java -jar "$JAR"
