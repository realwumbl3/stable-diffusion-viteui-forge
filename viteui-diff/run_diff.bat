@echo off
REM Batch script to run the diff builder with the specified directories

set ORIGINAL_DIR=C:\Users\wumbl\Documents\DEV\original-forge
set CURRENT_DIR=C:\Users\wumbl\Documents\DEV\stable-diffusion-viteui-forge
set OUTPUT_DIR=viteui-diff\diff-output

echo Running diff builder...
echo Original: %ORIGINAL_DIR%
echo Current: %CURRENT_DIR%
echo Output: %OUTPUT_DIR%
echo.

python viteui-diff\diff_builder.py "%ORIGINAL_DIR%" "%CURRENT_DIR%" --output-dir "%OUTPUT_DIR%"

echo.
echo Diff generation complete!
pause