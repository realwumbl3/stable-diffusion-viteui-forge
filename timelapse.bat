@echo off

if not defined PYTHON (set PYTHON=python)
if not defined VENV_DIR (set "VENV_DIR=%~dp0%venv")

if ["%VENV_DIR%"] == ["-"] goto :skip_venv
if ["%SKIP_VENV%"] == ["1"] goto :skip_venv

if exist "%VENV_DIR%\Scripts\Python.exe" (
    set PYTHON="%VENV_DIR%\Scripts\Python.exe"
    call "%VENV_DIR%\Scripts\activate.bat"
)

:skip_venv

set PYTHONPATH=%PYTHONPATH%;%~dp0

%PYTHON% modules_viteapi\timelime_creator\timelapse_creator.py %*

pause
