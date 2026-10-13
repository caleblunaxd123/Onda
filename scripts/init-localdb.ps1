$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$instances = sqllocaldb info
if ($instances -notcontains 'OndaDev') { sqllocaldb create OndaDev }
sqllocaldb start OndaDev
$env:ConnectionStrings__Onda = 'Server=(localdb)\OndaDev;Database=Onda;Integrated Security=true;TrustServerCertificate=true'
dotnet tool restore
dotnet ef database update --project backend/Onda.Infrastructure --startup-project backend/Onda.Api
if ($LASTEXITCODE -ne 0) { throw 'Database migration failed' }
