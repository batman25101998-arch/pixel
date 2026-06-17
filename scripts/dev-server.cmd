@echo off
cd /d C:\Users\Admin\Documents\pixel_world
call npm.cmd run dev -- --port 3000 >> dev-server.log 2>> dev-server.err.log
