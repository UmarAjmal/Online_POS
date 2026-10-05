@echo off
setlocal
cd /d "%~dp0"
title Falcon Swift POS - Server

echo ================================================================
echo   Falcon Swift POS - Development Server
echo   URL: http://localhost:3000
echo   Press Ctrl+C anytime to stop the server.
echo ================================================================
echo.

:: If port 3000 is still held by a dead process, free it
powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue) | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul

:: Clean stale .next/dev cache locks if needed
if exist .next\dev (
    rd /s /q .next\dev 2>nul
)

call npm run dev
