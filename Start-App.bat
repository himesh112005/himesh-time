@echo off
title Himesh Time - Daily Planner
echo ===================================================
echo     Himesh Time - Daily Routine & Task Planner
echo              100%% Offline PWA
echo ===================================================
echo.
echo Starting local web server at http://localhost:3000 ...
echo.
echo Opening browser...
start http://localhost:3000
echo.
echo [To install on Android / Chrome]:
echo 1. Open the URL in Google Chrome
echo 2. Click the 3 dots menu -> "Add to Home Screen" / "Install App"
echo 3. The app will install as a native offline app on your device!
echo.
echo Press Ctrl+C in this window to stop the server.
echo.
npx -y serve -l 3000 .
pause
