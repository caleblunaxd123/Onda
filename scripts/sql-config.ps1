# Shared SQL Server settings. Default: the local SQL Server Express instance (.\SQLEXPRESS), Windows authentication.
# Override with $env:ONDA_SQL_SERVER (e.g. '(localdb)\OndaDev') or a full $env:ConnectionStrings__Onda.
if (-not $env:ONDA_SQL_SERVER) { $env:ONDA_SQL_SERVER = '.\SQLEXPRESS' }
if (-not $env:ConnectionStrings__Onda) {
    $env:ConnectionStrings__Onda = "Server=$($env:ONDA_SQL_SERVER);Database=Onda;Integrated Security=true;Encrypt=true;TrustServerCertificate=true"
}
if (Test-Path (Join-Path $PSScriptRoot '../.tools/dotnet/dotnet.exe')) {
    $env:DOTNET_ROOT = (Resolve-Path (Join-Path $PSScriptRoot '../.tools/dotnet')).Path
    $env:PATH = "$env:DOTNET_ROOT;$env:PATH"
}
