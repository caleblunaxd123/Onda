# Creates (if needed) and migrates the Onda database on the configured SQL Server. Never drops data.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
. (Join-Path $PSScriptRoot 'sql-config.ps1')
if ($env:ONDA_SQL_SERVER -like '(localdb)*') {
    $name = $env:ONDA_SQL_SERVER.Split('\')[-1]
    if ((sqllocaldb info) -notcontains $name) { sqllocaldb create $name }
    sqllocaldb start $name
}
dotnet tool restore
if ($LASTEXITCODE -ne 0) { throw 'Tool restore failed' }
dotnet restore backend/Onda.slnx
if ($LASTEXITCODE -ne 0) { throw 'Package restore failed' }
dotnet ef database update --project backend/Onda.Infrastructure --startup-project backend/Onda.Api
if ($LASTEXITCODE -ne 0) { throw 'Database migration failed' }
Write-Output "Database Onda migrated on $($env:ONDA_SQL_SERVER)."
