@echo off
setlocal
title Fruition Mini - Instalasi Dependensi
cd /d "%~dp0"

echo ================================================================
echo           FRUITION MINI - INSTALASI DEPENDENSI PROYEK
echo ================================================================
echo.

:: 1. Periksa ketersediaan Node.js di sistem
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan di sistem Windows Anda!
    echo Silakan unduh dan instal Node.js (disarankan v18 ke atas) dari:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Tampilkan versi Node.js & npm yang terdeteksi
echo [OK] Node.js terdeteksi:
node -v
echo [OK] npm terdeteksi:
call npm -v
echo.

:: 2. Siapkan file konfigurasi lingkungan .env jika belum ada
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Berkas .env belum ditemukan. Menyalin dari .env.example...
        copy ".env.example" ".env" >nul
        echo [OK] Berkas .env berhasil dibuat otomatis.
        echo.
    )
)

:: 3. Jalankan npm install
echo [INFO] Memulai pengunduhan dan instalasi paket (Astro SSG & dependensi)...
echo Mohon tunggu beberapa saat...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Terjadi kesalahan saat menjalankan 'npm install'!
    echo Periksa koneksi internet Anda atau hak akses folder.
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo  [SUKSES] Seluruh dependensi berhasil diinstal dengan lengkap!
echo.
echo  Langkah selanjutnya:
echo  Jalankan 'start.bat' untuk memulai web blog dan Admin Shell.
echo ================================================================
echo.
pause
