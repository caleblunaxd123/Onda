# Alternative: use the project-specific LocalDB instance instead of SQL Server Express.
$env:ONDA_SQL_SERVER = '(localdb)\OndaDev'
& (Join-Path $PSScriptRoot 'init-db.ps1')
