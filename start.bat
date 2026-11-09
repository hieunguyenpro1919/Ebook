@echo off
title Khoi Dong Nha Sach
echo Dang khoi dong json-server va vite...
start "Backend API" cmd /k npm run server
start "Frontend Vite" cmd /k npm run dev
