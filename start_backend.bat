@echo off
cd /d "%~dp0backend"
call python -m uvicorn app.main:app --reload
pause
