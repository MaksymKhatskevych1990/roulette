@echo off
cd /d "%~dp0"
if exist venv\Scripts\activate (
    call venv\Scripts\activate
) else (
    echo Venv not found, trying global python...
)
uvicorn roulette-backend.main:app --reload
pause
