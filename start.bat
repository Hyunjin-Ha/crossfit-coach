@echo off
start "Backend" cmd /k "cd /d "%~dp0server" && python -m uvicorn main:app --reload"
start "Frontend" cmd /k "cd /d "%~dp0app" && npx expo start --web"
