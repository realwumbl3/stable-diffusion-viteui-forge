@echo off

if exist webui.settings.bat (
    call webui.settings.bat
)

if not defined PYTHON (set PYTHON=python)
if defined GIT (set "GIT_PYTHON_GIT_EXECUTABLE=%GIT%")
if not defined VENV_DIR (set "VENV_DIR=%~dp0%venv")

set SD_WEBUI_RESTART=tmp/restart
set ERROR_REPORTING=FALSE

mkdir tmp 2>NUL

%PYTHON% -c "" >tmp/stdout.txt 2>tmp/stderr.txt
if %ERRORLEVEL% == 0 goto :check_pip
echo Couldn't launch python
goto :show_stdout_stderr

:check_pip
%PYTHON% -mpip --help >tmp/stdout.txt 2>tmp/stderr.txt
if %ERRORLEVEL% == 0 goto :start_venv
if "%PIP_INSTALLER_LOCATION%" == "" goto :show_stdout_stderr
%PYTHON% "%PIP_INSTALLER_LOCATION%" >tmp/stdout.txt 2>tmp/stderr.txt
if %ERRORLEVEL% == 0 goto :start_venv
echo Couldn't install pip
goto :show_stdout_stderr

:start_venv
if ["%VENV_DIR%"] == ["-"] goto :skip_venv
if ["%SKIP_VENV%"] == ["1"] goto :skip_venv

dir "%VENV_DIR%\Scripts\Python.exe" >tmp/stdout.txt 2>tmp/stderr.txt
if %ERRORLEVEL% == 0 goto :activate_venv

for /f "delims=" %%i in ('CALL %PYTHON% -c "import sys; print(sys.executable)"') do set PYTHON_FULLNAME="%%i"
echo Creating venv in directory %VENV_DIR% using python %PYTHON_FULLNAME%
%PYTHON_FULLNAME% -m venv "%VENV_DIR%" >tmp/stdout.txt 2>tmp/stderr.txt
if %ERRORLEVEL% == 0 goto :upgrade_pip
echo Unable to create venv in directory "%VENV_DIR%"
goto :show_stdout_stderr

:upgrade_pip
"%VENV_DIR%\Scripts\Python.exe" -m pip install --upgrade pip
if %ERRORLEVEL% == 0 goto :activate_venv
echo Warning: Failed to upgrade PIP version

:activate_venv
set PYTHON="%VENV_DIR%\Scripts\Python.exe"
call "%VENV_DIR%\Scripts\activate.bat"
echo venv %PYTHON%

:skip_venv
if [%ACCELERATE%] == ["True"] goto :accelerate
goto :launch

:accelerate
echo Checking for accelerate
set ACCELERATE="%VENV_DIR%\Scripts\accelerate.exe"
if EXIST %ACCELERATE% goto :accelerate_launch

:launch
echo Starting Stable Diffusion WebUI server...
start "Stable Diffusion WebUI" %PYTHON% launch.py --disable-gpu-warning %*

echo Waiting for server to initialize...
timeout /t 5 /nobreak >nul

echo Starting Vite development server...
cd client
if exist node_modules (
    start "Vite Dev Server" npm run dev
) else (
    echo Installing client dependencies...
    npm install
    start "Vite Dev Server" npm run dev
)
cd ..

echo Both server and client are starting...
echo Server: http://localhost:7861
echo Client: http://localhost:5173 (or check Vite output for exact port)

pause
goto :endofscript

:accelerate_launch
echo Accelerating
echo Starting Stable Diffusion WebUI server with acceleration...
start "Stable Diffusion WebUI" %ACCELERATE% launch --num_cpu_threads_per_process=6 launch.py --disable-gpu-warning %*

echo Waiting for server to initialize...
timeout /t 5 /nobreak >nul

echo Starting Vite development server...
cd client
if exist node_modules (
    start "Vite Dev Server" npm run dev
) else (
    echo Installing client dependencies...
    npm install
    start "Vite Dev Server" npm run dev
)
cd ..

echo Both server and client are starting...
echo Server: http://localhost:7861
echo Client: http://localhost:5173 (or check Vite output for exact port)

pause
goto :endofscript

:show_stdout_stderr

echo.
echo exit code: %errorlevel%

for /f %%i in ("tmp\stdout.txt") do set size=%%~zi
if %size% equ 0 goto :show_stderr
echo.
echo stdout:
type tmp\stdout.txt

:show_stderr
for /f %%i in ("tmp\stderr.txt") do set size=%%~zi
if %size% equ 0 goto :show_stderr
echo.
echo stderr:
type tmp\stderr.txt

:endofscript

echo.
echo Launch unsuccessful. Exiting.
pause