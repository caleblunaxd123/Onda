param([string]$BaseUrl = 'http://127.0.0.1:5080', [switch]$Report)
# End-to-end checks against a running API with the real catalog. -Report also posts one test report.
$ErrorActionPreference = 'Stop'
function Get-Json($path) { Invoke-RestMethod "$BaseUrl$path" -TimeoutSec 60 }
function Assert($condition, $message) { if (-not $condition) { throw "FAIL: $message" } }

$health = Get-Json '/health/ready'
Assert ($health.status -eq 'ready') 'SQL Server is not ready'
$status = Get-Json '/api/v1/catalog/status'
Assert ($status.playable -gt 0) 'Catalog has no playable stations'

# Paginated country listing: contiguous pages, unique ids, real total, HTTPS only.
$ids = @(); $cursor = $null; $total = $null; $pages = 0
do {
    $path = '/api/v1/stations?country=PE&limit=50' + $(if ($cursor) { "&cursor=$cursor" } else { '' })
    $page = Get-Json $path
    if ($pages -eq 0) { $total = $page.total }
    $ids += $page.items.id
    foreach ($s in $page.items) { Assert $s.streamUrl.StartsWith('https://') "Non-HTTPS stream $($s.streamUrl)" }
    $cursor = $page.nextCursor; $pages++
} while ($page.hasMore -and $pages -lt 4)
Assert (($ids | Sort-Object -Unique).Count -eq $ids.Count) 'Duplicate ids across pages'
Assert ($total -ge $ids.Count) 'Total smaller than listed items'

$bounds = (Get-Json '/api/v1/facets/countries').items | Where-Object code -eq 'PE'
Assert ($bounds.count -gt 0) 'Country facet missing Peru'
$map = Get-Json '/api/v1/map?bbox=-82,-19,-68,0&zoom=4'
Assert ($map.total -gt 0 -and (($map.cells | Measure-Object count -Sum).Sum -eq $map.total)) 'Map cells do not add up to the area total'
$places = (Get-Json '/api/v1/facets/places?country=PE').items
$tags = (Get-Json '/api/v1/facets/tags').items
$languages = (Get-Json '/api/v1/facets/languages').items
$discover = Get-Json '/api/v1/stations?order=discover&seed=20261012&boostTags=jazz&limit=20'
Assert ($discover.items.Count -gt 0) 'Discover feed empty'
$missing = Get-Json '/api/v1/stations?country=PE&geo=missing&limit=5'
try { Invoke-RestMethod "$BaseUrl/api/v1/stations?limit=101" | Out-Null; throw 'FAIL: limit=101 accepted' }
catch { if ([int]$_.Exception.Response.StatusCode -ne 400) { throw } }
if ($Report) {
    $created = Invoke-RestMethod "$BaseUrl/api/v1/stations/$($ids[0])/reports" -Method Post -ContentType 'application/json' `
        -Body (@{ kind = 'other'; message = 'Prueba automática smoke-api'; platform = 'smoke' } | ConvertTo-Json)
    Assert ($created.status -eq 'received') 'Report not stored'
}
Write-Output ("PASS: mode={0}, playable={1}, PE total={2} ({3} pages, {4} unique ids), map PE={5} in {6} cells, places={7}, tags={8}, languages={9}, discover={10}, PE without coordinates={11}" -f `
    $status.mode, $status.playable, $total, $pages, $ids.Count, $map.total, $map.cells.Count, $places.Count, $tags.Count, $languages.Count, $discover.items.Count, $missing.total)
