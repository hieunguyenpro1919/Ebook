@echo off
chcp 65001 >nul
title Khởi Động Dự Án Nhà Sách (Fullstack Node.js + MySQL + Vite)
echo ========================================================
echo   HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ BÁN SÁCH "NHASACH"
echo ========================================================
echo.
echo [1/3] Đang kiểm tra và khởi động Docker MySQL & phpMyAdmin...
docker-compose up -d

echo.
echo [2/3] Đang khởi động Backend Node.js REST API (Port 3000)...
start "Backend API (Node.js + MySQL)" cmd /k "title Backend API && npm run server"

echo.
echo [3/3] Đang khởi động Frontend Vite (Port 5173)...
start "Frontend Vite" cmd /k "title Frontend Vite && npm run dev"

echo.
echo ========================================================
echo   TẤT CẢ DỊCH VỤ ĐÃ ĐƯỢC KHỞI ĐỘNG THÀNH CÔNG!
echo ========================================================
echo   - Frontend:   http://localhost:5173
echo   - Backend:    http://localhost:3000
echo   - phpMyAdmin: http://localhost:8080
echo ========================================================
echo.
pause
