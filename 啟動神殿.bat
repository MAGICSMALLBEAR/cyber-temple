@echo off
chcp 65001 >nul
title 賽博虛擬神殿
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo 找不到 Node.js，請先安裝：https://nodejs.org/
  echo 沒有伺服器也能直接開 index.html，但多人連線無法使用。
  pause
  exit /b 1
)

echo 正在為您啟動「賽博虛擬神殿」...
rem 已經在跑的話，新的這個會因埠號佔用而結束，不影響
start "虛擬神殿伺服器（關閉此視窗即停止）" node server.js
timeout /t 1 /nobreak >nul
start "" "http://localhost:8080"
exit
