@echo off
cd /d "%~dp0"
title Khoi Dong He Thong Nha Sach

echo ========================================================
echo    KHOI DONG HE THONG NHA SACH (NODEJS + MYSQL + VITE)
echo ========================================================
echo.

echo [1/3] Kiem tra va khoi dong MySQL Docker...
docker-compose up -d

echo.
echo [2/3] Khoi dong Backend Node.js API (Port 3000)...
start "Backend API (Node.js)" cmd /k "npm run server"

echo.
echo [3/3] Khoi dong Frontend Vite (Port 5173)...
start "Frontend (Vite)" cmd /k "npm run dev"

echo.
echo ========================================================
echo   HE THONG DA KHOI DONG THANH CONG!
echo ========================================================
echo   - Frontend:   http://localhost:5173
echo   - Backend:    http://localhost:3000
echo   - phpMyAdmin: http://localhost:8080
echo ========================================================
echo.
pause
