@echo off
title Sincronizador Automatico Kevingston BI - Supabase
cd /d "%~dp0"
echo ========================================================
echo   KEVINGSTON BI - SINCRONIZADOR EN TIEMPO REAL
echo ========================================================
echo Monitoreando carpetas de Franquicias (San Isidro, Castelar, etc.)...
echo Guarde sus archivos Excel en Archivos_Excel y se subiran solos a la nube.
echo Para detener la sincronizacion, simplemente cierre esta ventana.
echo ========================================================
echo.
node sync_service.js
pause
