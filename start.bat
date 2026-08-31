@echo off
setlocal enabledelayedexpansion
title PythonPro Exam Portal (LAN Ready)
color 0B

cls
echo =====================================================================
echo                  PythonPro Exam Platform v2.0
echo               High-Speed Multi-Tier Assessment Engine
echo =====================================================================
echo.

REM 1. Query Local Network IP Address
set LOCAL_IP=127.0.0.1
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "((Get-NetIPAddress -AddressFamily IPv4) | Where-Object InterfaceAlias -notmatch 'Loopback' | Where-Object IPAddress -notmatch '^(127|169\.254)' | Select-Object -ExpandProperty IPAddress -First 1)" 2^>nul`) do (
    set LOCAL_IP=%%i
)

REM Fallback if powershell was restricted
if "%LOCAL_IP%"=="127.0.0.1" (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"IP Address"') do (
        for /f "tokens=1" %%b in ("%%a") do (
            if not "%%b"=="" set LOCAL_IP=%%b
        )
    )
)

echo [*] Detected Local Network IP: %LOCAL_IP%
echo.

REM 2. Start Backend FastAPI Server
echo [1/2] Launching Backend Server (FastAPI on 0.0.0.0:8000)...
start "PythonPro Backend (Port 8000)" cmd /k "title PythonPro Backend && cd /d %~dp0server && echo Starting FastAPI Backend on 0.0.0.0:8000... && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

REM 3. Start Frontend Vite Dev Server
echo [2/2] Launching Frontend Server (Vite on 0.0.0.0:5173)...
start "PythonPro Frontend (Port 5173)" cmd /k "title PythonPro Frontend && cd /d %~dp0 && echo Starting Vite Dev Server on 0.0.0.0:5173... && npm run dev -- --host 0.0.0.0"

timeout /t 2 /nobreak >nul

REM 4. Display Active URLs
cls
echo =====================================================================
echo                  PythonPro Exam Platform is LIVE!
echo =====================================================================
echo.
echo   [+] HOST MACHINE ACCESS (This Computer):
echo       - Student Exam Portal:   http://localhost:5173
echo       - Admin Telemetry Hub:   http://localhost:5173/admin
echo       - Backend Swagger Docs:  http://localhost:8000/docs
echo.
echo   [+] LOCAL NETWORK / LAN ACCESS (Phones, Tablets, Laptops on Wi-Fi):
echo       - Student Exam Portal:   http://%LOCAL_IP%:5173
echo       - Admin Telemetry Hub:   http://%LOCAL_IP%:5173/admin
echo       - Backend API Endpoint:  http://%LOCAL_IP%:8000
echo.
echo =====================================================================
echo   TIP: Share the Network Portal URL with students on the same network.
echo   Both server processes are running in separate dedicated windows.
echo =====================================================================
echo.

REM Automatically open the exam portal in default browser
echo Opening Student Portal in your default browser...
start http://localhost:5173

echo.
echo Press any key to exit this launcher window (servers will stay running).
pause >nul
