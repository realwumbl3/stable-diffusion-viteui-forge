@echo off

rem AUTO_CLOSE_WINDOW is no longer used - SD server now runs in main window
rem Set to 1 to automatically close the main window after starting servers, 0 to keep it open (default)
if not defined AUTO_CLOSE_WINDOW (set AUTO_CLOSE_WINDOW=0)

if exist webui.settings.bat (
    call webui.settings.bat
)

if not defined PYTHON (set PYTHON=python)
if defined GIT (set "GIT_PYTHON_GIT_EXECUTABLE=%GIT%")
if not defined VENV_DIR (set "VENV_DIR=%~dp0%venv")

set SD_WEBUI_RESTART=tmp/restart
set ERROR_REPORTING=FALSE

mkdir tmp 2>NUL

setlocal enabledelayedexpansion

rem Check for --vite argument
set USE_VITE=0
for %%i in (%*) do (
    if "%%i"=="--vite" set USE_VITE=1
)

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
if %USE_VITE%==1 goto :vite_launch

echo Checking if client is built...
if not exist "client\dist" (
    echo Client dist folder not found. Building client...
    cd client
    if not exist node_modules (
        echo Installing client dependencies...
        call npm install
    )
    echo Building client for production...
    call npm run build
    cd ..
    if not exist "client\dist" (
        echo ERROR: Failed to build client. Please check the build output above.
        pause
        goto :endofscript
    )
    echo Client built successfully.
) else (
    echo Client dist folder found. Skipping build.
    echo Note: To rebuild the client, delete the client\dist folder and run this script again.
)

echo Starting Stable Diffusion API server with integrated frontend...
echo Frontend will be served from: http://localhost:7861
echo API endpoints will be available at: http://localhost:7861/api/*
%PYTHON% launch.py --disable-gpu-warning %*

goto :endofscript

:vite_launch
echo Starting Vite development server and API server...
echo Frontend will be served from: http://localhost:5173
echo API endpoints will be available at: http://localhost:7861/api/* (proxied through Vite)

rem Remove --vite from arguments for the API server
set API_ARGS=
for %%i in (%*) do (
    if not "%%i"=="--vite" set API_ARGS=!API_ARGS! %%i
)

rem Start API server in background
echo Starting API server on port 7861...
start "Stable Diffusion API" %PYTHON% launch.py --disable-gpu-warning %API_ARGS%

rem Wait a moment for API server to start
timeout /t 3 /nobreak > nul

rem Start Vite dev server
echo Starting Vite dev server on port 5173...
cd client
if not exist node_modules (
    echo Installing client dependencies...
    call npm install
)
call npm run dev
cd ..
goto :endofscript

:accelerate_launch
echo Accelerating
if %USE_VITE%==1 goto :vite_accelerate_launch
goto :accelerate_launch_normal

:vite_accelerate_launch
echo Starting Vite development server and API server with acceleration...
echo Frontend will be served from: http://localhost:5173
echo API endpoints will be available at: http://localhost:7861/api/* (proxied through Vite)

rem Remove --vite from arguments for the API server
set API_ARGS=
for %%i in (%*) do (
    if not "%%i"=="--vite" set API_ARGS=!API_ARGS! %%i
)

rem Start API server with acceleration in background
echo Starting API server on port 7861 with acceleration...
start "Stable Diffusion API" %ACCELERATE% launch --num_cpu_threads_per_process=6 launch.py --disable-gpu-warning --cuda-malloc %API_ARGS%

rem Wait a moment for API server to start
timeout /t 3 /nobreak > nul

rem Start Vite dev server
echo Starting Vite dev server on port 5173...
cd client
if not exist node_modules (
    echo Installing client dependencies...
    call npm install
)
call npm run dev
cd ..
goto :endofscript

:accelerate_launch_normal

echo Checking if client is built...
if not exist "client\dist" (
    echo Client dist folder not found. Building client...
    cd client
    if not exist node_modules (
        echo Installing client dependencies...
        call npm install
    )
    echo Building client for production...
    call npm run build
    cd ..
    if not exist "client\dist" (
        echo ERROR: Failed to build client. Please check the build output above.
        pause
        goto :endofscript
    )
    echo Client built successfully.
) else (
    echo Client dist folder found. Skipping build.
    echo Note: To rebuild the client, delete the client\dist folder and run this script again.
)

echo Starting Stable Diffusion API server with integrated frontend and acceleration...
echo Frontend will be served from: http://localhost:7861
echo API endpoints will be available at: http://localhost:7861/api/*
%ACCELERATE% launch --num_cpu_threads_per_process=6 launch.py --disable-gpu-warning --cuda-malloc %*

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