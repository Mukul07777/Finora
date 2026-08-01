@echo off
setlocal

echo ============================================
echo   Finora - run script
echo ============================================
echo.
echo 1. Run the site (npm install if needed, then dev server)
echo 2. Run onchain tests (24 tests)
echo 3. Run onchain attack demo (live EVM reverts)
echo 4. Exit
echo.

set /p CHOICE="Choose an option [1-4]: "

if "%CHOICE%"=="1" goto SITE
if "%CHOICE%"=="2" goto ONCHAIN_TEST
if "%CHOICE%"=="3" goto ONCHAIN_DEMO
if "%CHOICE%"=="4" goto END

echo Invalid choice.
goto END

:SITE
if not exist "node_modules" (
    echo Installing site dependencies...
    call npm install
    if errorlevel 1 goto ERROR
)
echo.
echo Starting dev server at http://localhost:3000 ...
call npm run dev
goto END

:ONCHAIN_TEST
pushd onchain
if not exist "node_modules" (
    echo Installing onchain dependencies...
    call npm install
    if errorlevel 1 (
        popd
        goto ERROR
    )
)
call npm test
popd
goto END

:ONCHAIN_DEMO
pushd onchain
if not exist "node_modules" (
    echo Installing onchain dependencies...
    call npm install
    if errorlevel 1 (
        popd
        goto ERROR
    )
)
call npm run demo:attack
popd
goto END

:ERROR
echo.
echo Something went wrong - see the output above.
pause
exit /b 1

:END
pause
endlocal
