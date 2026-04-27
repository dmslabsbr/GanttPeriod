#!/bin/bash

# Script para subir o container da aplicação usando Docker Compose

echo "Iniciando processo de build e deploy com Docker Compose..."

# Verifica se o docker-compose ou docker compose está disponível
if command -v docker-compose &> /dev/null
then
    docker-compose up -d --build
elif docker compose version &> /dev/null
then
    docker compose up -d --build
else
    echo "Erro: Docker Compose não encontrado. Por favor, instale o Docker Compose."
    exit 1
fi

echo "Aplicação subindo em: http://localhost:8080"
echo "Para ver os logs, execute: docker compose logs -f"
