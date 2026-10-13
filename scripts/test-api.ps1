param([string]$Filter = '')
# Backend tests. SQL Server integration tests create and drop their own OndaTest_* databases on ONDA_TEST_SQL
# (defaults to the configured server) and are skipped when it is unreachable.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
. (Join-Path $PSScriptRoot 'sql-config.ps1')
if (-not $env:ONDA_TEST_SQL) { $env:ONDA_TEST_SQL = "Server=$($env:ONDA_SQL_SERVER);Integrated Security=true;TrustServerCertificate=true" }
$arguments = @('test', 'backend/Onda.slnx', '-c', 'Release')
if ($Filter) { $arguments += @('--filter', $Filter) }
dotnet @arguments
exit $LASTEXITCODE
