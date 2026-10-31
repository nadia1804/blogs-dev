@echo off
setlocal
title Fruition Mini - Server v0.2.8
cd /d "%~dp0"

echo ================================================================
echo             FRUITION MINI - DEVELOPMENT SERVER v0.2.8
echo ================================================================
echo.

:: 1. Periksa ketersediaan Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan!
    echo Silakan unduh dan instal Node.js dari https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Periksa apakah dependensi node_modules sudah diinstal
if not exist "node_modules\" (
    echo [PERINGATAN] Folder 'node_modules' belum terpasang!
    echo Menjalankan instalasi dependensi otomatis terlebih dahulu...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Gagal menginstal dependensi! Silakan jalankan install.bat manual.
        echo.
        pause
        exit /b 1
    )
)

:: 3. Periksa file konfigurasi .env
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Berkas .env belum ditemukan. Menyalin dari .env.example...
        copy ".env.example" ".env" >nul
    )
)

:: 4. Jalankan Dev Server
echo ================================================================
echo  Server sedang berjalan di:
echo  - Pratinjau Tema : http://localhost:4321/theme
echo  - Halaman Admin  : http://localhost:4321/admin
echo  - Modul Safelink : http://localhost:4321/safelink
echo.
echo  Tekan [Ctrl + C] untuk menghentikan server kapan saja.
echo ================================================================
echo.

node dev-server.js

if %errorlevel% neq 0 (
    echo.
    echo [INFO] Server telah berhenti.
    pause
)
