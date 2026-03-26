@echo off
cd /d C:\Users\Cliente\Documents\vida-em-ordem
set CI=1
npx expo start --port 8082 --clear > expo-reload.log 2>&1
