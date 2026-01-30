@echo off
REM Batch script to run the diff builder with the specified directories

set CURRENT_DIR=%~dp0..
set ORIGINAL_DIR=%~dp0..\original-forge
set OUTPUT_DIR=%~dp0diff-output

echo Running diff builder...
echo Original: %ORIGINAL_DIR%
echo Current: %CURRENT_DIR%
echo Output: %OUTPUT_DIR%
echo.

python diff_builder.py "%ORIGINAL_DIR%" "%CURRENT_DIR%" --output-dir "%OUTPUT_DIR%"

echo.
echo Diff generation complete!
pause