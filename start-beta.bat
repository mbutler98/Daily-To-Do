@echo off
rem Runs Daily To Do on this laptop and shares it, over HTTPS, only with devices in your Tailscale network.
rem It uses port 8443 so it can run next to Claude Alerts (which uses the normal https port).
cd /d "%~dp0"
if not exist .env copy .env.example .env >nul
python -m pip install -q -r requirements.txt

set "TS=C:\Program Files\Tailscale\tailscale.exe"
if not exist "%TS%" (
  echo.
  echo Tailscale isn't installed on this computer. Install it from https://tailscale.com/download/windows,
  echo sign in with the same account as your iPhone, then run this again.
  pause
  exit /b 1
)

set "BASE="
for /f "delims=" %%u in ('python tools\tailnet_url.py') do set "BASE=%%u"
if "%BASE%"=="" (
  echo.
  echo Tailscale is installed but not signed in. Open Tailscale from the system tray, log in, then run this again.
  pause
  exit /b 1
)
set "PUBLIC_URL=%BASE%:8443"

rem Publish the app to your tailnet only (not the internet). Tailscale supplies the HTTPS certificate.
"%TS%" serve --bg --https=8443 8060
if errorlevel 1 (
  echo.
  echo Tailscale couldn't share the app. In the Tailscale admin console, turn on MagicDNS and HTTPS certificates:
  echo   https://login.tailscale.com/admin/dns
  echo then run this again.
  pause
  exit /b 1
)

rem The app itself still only listens on this computer; Tailscale Serve is the only way in from other devices.
set HOST=127.0.0.1
set PORT=8060
set HTTPS=1
set TRUST_PROXY=1
set KEEP_AWAKE=1

echo.
echo  Daily To Do:  %PUBLIC_URL%
echo  Open that address on your iPhone (with Tailscale connected), then Share ^> Add to Home Screen.
echo  To stop sharing:  "%TS%" serve --https=8443 off
echo.
start "" %PUBLIC_URL%
python run.py
