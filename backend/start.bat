@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "JAR=%SCRIPT_DIR%mutation-ai-studio.jar"

if not exist "%JAR%" (
    echo JAR nao encontrado: %JAR%
    exit /b 1
)

where java >nul 2>&1
if errorlevel 1 (
    echo Java nao encontrado. Instale Java 21 ou superior.
    exit /b 1
)

echo Iniciando Mutation AI Studio na porta 8081...
java -jar "%JAR%"
