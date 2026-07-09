@echo off
title APK Decompiler - apktool + jadx

REM Check if any files were dragged
if "%~1"=="" (
    echo ========================================
    echo    APK Decompiler - apktool + jadx
    echo ========================================
    echo.
    echo   Drag and drop one or more APK files onto this script.
    echo.
    echo   Example: drag "app.apk" onto this .bat file
    echo.
    pause
    exit /b 1
)

REM Process each dragged file
:loop
if "%~1"=="" goto :done

echo [INFO] Processing: %~nx1

REM Call PowerShell script with the APK path
powershell.exe -ExecutionPolicy Bypass -File "%~dp0decompile-apk.ps1" -ApkPath "%~f1"

if %ERRORLEVEL% neq 0 (
    echo [WARN] Failed to process: %~nx1
)

shift
goto :loop

:done
echo.
echo ========================================
echo   All files processed.
echo ========================================
pause
