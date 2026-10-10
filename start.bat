@echo off
rem Runs Daily To Do on this computer only, at http://127.0.0.1:8060
cd /d "%~dp0"
if not exist .env copy .env.example .env >nul
python -m pip install -q -r requirements.txt
start "" http://127.0.0.1:8060
python run.py
