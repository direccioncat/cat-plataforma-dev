@echo off
echo ============================================
echo  CAT Plataforma - Subir a GitHub
echo ============================================
echo.

set TOKEN=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
set REPO=https://%TOKEN%@github.com/agusricciardiw/cat-plataforma.git
set FRONTEND=C:\Users\Agust?n\cat-plataforma
set BACKEND=C:\cat-api
set TEMP_DIR=C:\cat-repo-temp

echo [1/5] Creando carpeta temporal...
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"
mkdir "%TEMP_DIR%\frontend"
mkdir "%TEMP_DIR%\backend"

echo [2/5] Copiando frontend (sin node_modules y dist)...
xcopy "%FRONTEND%" "%TEMP_DIR%\frontend" /E /I /Q /EXCLUDE:%BACKEND%\xcopy_exclude.txt

echo [3/5] Copiando backend (sin node_modules y uploads)...
xcopy "%BACKEND%" "%TEMP_DIR%\backend" /E /I /Q /EXCLUDE:%BACKEND%\xcopy_exclude.txt

echo [4/5] Inicializando git y commiteando...
cd /d "%TEMP_DIR%"
git init
git config user.email "aricciardiwolfenson@buenosaires.gob.ar"
git config user.name "Agustin Ricciardi"

echo # CAT Plataforma > README.md
echo. >> README.md
echo Sistema de gestion del Cuerpo de Agentes de Transito - DGCAT/GCBA >> README.md
echo. >> README.md
echo ## Estructura >> README.md
echo - `frontend/` - React 19 + Vite >> README.md
echo - `backend/` - Node.js + Express >> README.md
echo. >> README.md
echo ## Setup >> README.md
echo Ver `.env.example` en cada carpeta para configurar variables de entorno. >> README.md

echo node_modules/ > .gitignore
echo .env >> .gitignore
echo dist/ >> .gitignore
echo uploads/ >> .gitignore
echo *.log >> .gitignore

git add .
git commit -m "Initial commit - CAT Plataforma"

echo [5/5] Subiendo a GitHub...
git branch -M main
git remote add origin %REPO%
git push -u origin main

echo.
echo ============================================
echo  Listo! Repo en:
echo  https://github.com/agusricciardiw/cat-plataforma
echo ============================================
echo.
echo IMPORTANTE: Revoca el token de GitHub en:
echo https://github.com/settings/tokens
echo y genera uno nuevo cuando lo necesites.
echo.
pause
