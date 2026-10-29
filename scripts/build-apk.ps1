param([Parameter(Mandatory = $true)][string]$ApiUrl, [string]$Abis = 'arm64-v8a,armeabi-v7a,x86_64', [ValidateRange(1,8)][int]$MaxWorkers = 2)
# Test APK with embedded JS (no Metro). HTTPS builds disable cleartext traffic; HTTP is for LAN testing.
# Signed with the debug key from the generated Android project; not for store distribution.
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location (Join-Path $root 'apps/mobile')
$ondaApiUri = [Uri]$ApiUrl
if (-not $ondaApiUri.IsAbsoluteUri -or $ondaApiUri.Scheme -notin @('http','https')) { throw 'ApiUrl must be an absolute HTTP(S) URL.' }
$ondaApiSecure = $ondaApiUri.Scheme -eq 'https'
$env:APP_VARIANT = if ($ondaApiSecure) { 'preview' } else { 'development' }
$env:EXPO_PUBLIC_API_URL = $ApiUrl
# Never let apps/mobile/.env.local (or a Gradle daemon started with another environment) choose the API.
$env:EXPO_NO_DOTENV = '1'
# EXPO_PUBLIC_* values are inlined at transform time and Metro reuses cached transforms: start clean.
$ondaCacheTargets = @([IO.Path]::GetFullPath((Join-Path $env:TEMP 'metro-cache')), [IO.Path]::GetFullPath((Join-Path $root 'apps/mobile/node_modules/.cache')))
foreach ($ondaCacheTarget in $ondaCacheTargets) {
  if (Test-Path -LiteralPath $ondaCacheTarget) {
    $ondaCacheItem = Get-Item -LiteralPath $ondaCacheTarget -Force
    $ondaCacheResolved = (Resolve-Path -LiteralPath $ondaCacheTarget).ProviderPath
    if ($ondaCacheItem.LinkType -or $ondaCacheResolved -ne $ondaCacheTarget) { throw 'Refusing to remove a redirected cache directory.' }
    Remove-Item -LiteralPath $ondaCacheResolved -Recurse -Force
  }
}
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
# SDK 57 recreates the native project by default; the package id differs between variants.
node scripts/prepare-globe.cjs
if ($LASTEXITCODE -ne 0) { throw 'Globe packaging failed' }
$env:CI = '1'
npx expo prebuild --platform android --no-install
if ($LASTEXITCODE -ne 0) { throw 'Prebuild failed' }
Push-Location android
.\gradlew.bat --no-daemon "--max-workers=$MaxWorkers" '-Dorg.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=1024m' assembleRelease "-PreactNativeArchitectures=$Abis"
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { throw 'Gradle build failed' }
$version = (Get-Content app.json -Raw | ConvertFrom-Json).expo.version
New-Item -ItemType Directory -Force (Join-Path $root 'dist') | Out-Null
$ondaApiLabel = if ($ondaApiSecure) { 'contabo' } else { 'lan' }
$target = Join-Path $root "dist/ONDA-$version-$ondaApiLabel.apk"
$built = 'android/app/build/outputs/apk/release/app-release.apk'
# Verify the embedded JavaScript targets the requested API before publishing anything.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path $built))
try {
  $reader = New-Object IO.StreamReader($zip.GetEntry('assets/index.android.bundle').Open())
  $bundle = $reader.ReadToEnd(); $reader.Close()
} finally { $zip.Dispose() }
if (-not $bundle.Contains($ApiUrl)) { throw "The APK bundle does not contain $ApiUrl; refusing to copy it." }
Copy-Item $built $target -Force
Write-Output "APK: $target (API $ApiUrl)"
