# API for the Android emulator/devices (listens on all interfaces, port 5080).
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
. (Join-Path $PSScriptRoot 'sql-config.ps1')
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project backend/Onda.Api --no-launch-profile --urls http://0.0.0.0:5080
