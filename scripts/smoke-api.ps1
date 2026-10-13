param([string]$BaseUrl = 'http://127.0.0.1:5080')
$ErrorActionPreference = 'Stop'
$health = Invoke-RestMethod "$BaseUrl/health/ready" -TimeoutSec 10
if ($health.status -ne 'ready') { throw 'SQL Server is not ready' }
$page = Invoke-RestMethod "$BaseUrl/api/v1/stations?country=PE&limit=10" -TimeoutSec 50
if ($page.items.Count -lt 1) { throw 'Real catalog returned no compatible stations' }
if (($page.items.id | Sort-Object -Unique).Count -ne $page.items.Count) { throw 'Duplicate station IDs' }
foreach ($station in $page.items) {
    if (-not $station.streamUrl.StartsWith('https://')) { throw 'Unexpected stream scheme' }
}
try {
    Invoke-RestMethod "$BaseUrl/api/v1/stations?limit=101" -ErrorAction Stop | Out-Null
    throw 'Validation did not reject invalid limit'
} catch {
    if ([int]$_.Exception.Response.StatusCode -ne 400) { throw }
}
Write-Output "PASS: SQL readiness, real catalog ($($page.items.Count) stations), unique IDs, HTTPS streams, HTTP validation."
