@echo off
"%GCSC_TEST_NODE%" "%~dp0capture.cjs" %*
exit /b %errorlevel%
