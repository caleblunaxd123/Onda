# API for the web preview only (localhost:5080).
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
. (Join-Path $PSScriptRoot 'sql-config.ps1')
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project backend/Onda.Api --no-launch-profile --urls http://localhost:5080
