$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$env:ConnectionStrings__Onda = 'Server=(localdb)\OndaDev;Database=Onda;Integrated Security=true;Encrypt=true;TrustServerCertificate=false'
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project backend/Onda.Api --no-launch-profile --urls http://localhost:5080
