@echo off
cls
color 0A

:: Muda para o diretório do projeto (onde o .bat está)
cd /d "%~dp0"

echo ===================================
echo    Deploy Automatico - Meu Portal
echo ===================================
echo.

:: Verifica se o Git está instalado
echo Verificando instalacao do Git...
where git >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo ERRO: Git nao encontrado! Por favor, instale o Git primeiro.
    pause
    exit /b
)

:: Verifica se é um repositório Git e inicializa se necessário
if not exist .git (
    echo Inicializando repositorio Git...
    git init
    git remote add origin https://github.com/richardspanhol/meu_portal.git
)

:: Configura diretório como seguro
echo.
echo Configurando diretorio como seguro...
git config --global --add safe.directory "%CD%"

:: Verifica e mostra alterações
echo.
echo Verificando alteracoes...
git status

:: Adiciona todas as alterações ao Git
git add .

:: Commit com data/hora
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set datetime=%datetime:~0,8%-%datetime:~8,6%
git commit -m "Deploy automatico %datetime%"

:: Push para o GitHub
git push origin main

:: Conclusão
color 0A
echo.
echo ===================================
echo    Deploy concluido com sucesso!
echo ===================================
echo.
echo O site sera atualizado em alguns minutos.
echo GitHub Pages: https://richardspanhol.github.io/meu_portal/
echo.
echo Pressione qualquer tecla para sair...
pause > nul 