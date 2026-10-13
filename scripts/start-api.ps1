$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$env:ConnectionStrings__Onda = 'Server=(localdb)\OndaDev;Database=Onda;Integrated Security=true;TrustServerCertificate=true'
$env:ASPNETCORE_ENVIRONMENT = 'Development'
sqllocaldb start OndaDev
dotnet run --project backend/Onda.Api --no-launch-profile --urls http://0.0.0.0:5080
