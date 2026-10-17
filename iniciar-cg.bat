@echo off
REM ==========================================================
REM  Broadcast CG - arranque para el servicio
REM  Doble clic y deja esta ventana abierta durante la transmision.
REM  Para detenerlo: cierra la ventana o presiona Ctrl+C.
REM ==========================================================
title Broadcast CG (no cerrar durante la transmision)
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias por primera vez...
  call npm install || goto :error
)
echo.
echo  Panel de control:  http://localhost:5173
echo  (La URL para OBS se copia desde el panel)
echo.
call npm start
goto :eof
:error
echo Ocurrio un error. Revisa que Node.js este instalado.
pause
