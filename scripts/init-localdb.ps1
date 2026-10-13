$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$instances = sqllocaldb info
if ($instances -notcontains 'OndaDev') { sqllocaldb create OndaDev }
sqllocaldb start OndaDev
$env:ConnectionStrings__Onda = 'Server=(localdb)\OndaDev;Database=Onda;Integrated Security=true;TrustServerCertificate=true'
dotnet tool restore
if ($LASTEXITCODE -ne 0) { throw 'Tool restore failed' }
dotnet restore backend/Onda.slnx
if ($LASTEXITCODE -ne 0) { throw 'Package restore failed' }
dotnet ef database update --project backend/Onda.Infrastructure --startup-project backend/Onda.Api
if ($LASTEXITCODE -ne 0) { throw 'Database migration failed' }
