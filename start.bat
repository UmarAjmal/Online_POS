@echo off
setlocal enabledelayedexpansion
title Pharmacy Online - Server Control Panel
color 0B

:: Set working directory to script location
cd /d "%~dp0"

:CHECK_NODE
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:MENU
cls
echo ================================================================
echo           PHARMACY ONLINE - SERVER CONTROL PANEL
echo ================================================================
echo.
echo   --- SERVER START OPTIONS ---
echo   [1] Start Development Server (npm run dev)
echo   [2] Start Development Server ^& Open Browser (localhost:3000)
echo   [3] Start Server ^& Open Browser (npm run dev + browser)
echo   [4] Start Server Only (npm run dev)
echo.
echo   --- SERVER STOP / CLEANUP OPTIONS ---
echo   [5] Stop Running Server on Port 3000 (Free Port 3000)
echo   [6] Force Stop ALL Running Node.js Processes (Kill all servers)
echo.
echo   --- DATABASE ^& DOCKER ---
echo   [7] Initialize / Seed Database (node scripts/init_db.js)
echo   [8] Start Docker Containers (docker compose up -d --build)
echo   [9] Stop Docker Containers (docker compose down)
echo.
echo   --- UTILITIES ---
echo   [10] Install / Refresh Dependencies (npm install)
echo   [11] Open Application in Browser (http://localhost:3000)
echo   [0]  Exit
echo.
echo ================================================================
set /p choice="Enter option [0-11]: "

if "%choice%"=="1" goto DEV_SERVER
if "%choice%"=="2" goto DEV_BROWSER
if "%choice%"=="3" goto BUILD_START
if "%choice%"=="4" goto PROD_START
if "%choice%"=="5" goto STOP_PORT_3000
if "%choice%"=="6" goto KILL_NODE
if "%choice%"=="7" goto DB_INIT
if "%choice%"=="8" goto DOCKER_UP
if "%choice%"=="9" goto DOCKER_DOWN
if "%choice%"=="10" goto NPM_INSTALL
if "%choice%"=="11" goto OPEN_BROWSER
if "%choice%"=="0" goto EXIT_APP

echo.
echo [!] Invalid selection. Please choose a valid option number.
timeout /t 2 >nul
goto MENU

:DEV_SERVER
cls
echo ================================================================
echo   Starting Development Server...
echo   URL: http://localhost:3000
echo   Press Ctrl+C anytime to stop the server.
echo ================================================================
echo.
if exist .next\dev rd /s /q .next\dev 2>nul
call npm run dev
echo.
pause
goto MENU

:DEV_BROWSER
cls
echo ================================================================
echo   Starting Development Server and Launching Browser...
echo   URL: http://localhost:3000
echo   Press Ctrl+C anytime to stop the server.
echo ================================================================
echo.
start "" http://localhost:3000
if exist .next\dev rd /s /q .next\dev 2>nul
call npm run dev
echo.
pause
goto MENU

:BUILD_START
cls
echo ================================================================
echo   Starting Server and Launching Browser...
echo   URL: http://localhost:3000
echo   Press Ctrl+C anytime to stop the server.
echo ================================================================
echo.
echo [INFO] This system uses SQLite offline mode (no separate build needed).
echo [INFO] Starting optimized development server...
echo.
start "" http://localhost:3000
if exist .next\dev rd /s /q .next\dev 2>nul
call npm run dev
echo.
pause
goto MENU

:PROD_START
cls
echo ================================================================
echo   Starting Application Server...
echo   URL: http://localhost:3000
echo   Press Ctrl+C anytime to stop the server.
echo ================================================================
echo.
echo [INFO] Starting server with SQLite offline support...
echo.
if exist .next\dev rd /s /q .next\dev 2>nul
call npm run dev
echo.
pause
goto MENU

:STOP_PORT_3000
cls
echo ================================================================
echo   Stopping server and freeing Port 3000...
echo ================================================================
echo.
powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue) | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host '[SUCCESS] Port 3000 freed (any active server stopped).' -ForegroundColor Green"
echo.
pause
goto MENU

:KILL_NODE
cls
echo ================================================================
echo   Force Stopping ALL Node.js processes...
echo ================================================================
echo.
powershell -NoProfile -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; Write-Host '[SUCCESS] All Node.js processes stopped.' -ForegroundColor Green"
echo.
pause
goto MENU

:DB_INIT
cls
echo ================================================================
echo   Initializing Database...
echo ================================================================
echo.
call npm run db:init
echo.
pause
goto MENU

:DOCKER_UP
cls
echo ================================================================
echo   Starting Docker Containers...
echo ================================================================
echo.
call npm run docker:up
echo.
echo Docker containers are running in background!
echo View logs using: npm run docker:logs
pause
goto MENU

:DOCKER_DOWN
cls
echo ================================================================
echo   Stopping Docker Containers...
echo ================================================================
echo.
call npm run docker:down
echo.
pause
goto MENU

:NPM_INSTALL
cls
echo ================================================================
echo   Installing / Updating npm Packages...
echo ================================================================
echo.
call npm install --legacy-peer-deps
echo.
echo Installation completed.
pause
goto MENU

:OPEN_BROWSER
start "" http://localhost:3000
echo.
echo [OK] Browser opened for http://localhost:3000
timeout /t 2 >nul
goto MENU

:EXIT_APP
echo.
echo Exiting Control Panel...
exit /b 0
