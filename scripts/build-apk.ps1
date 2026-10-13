param([Parameter(Mandatory = $true)][string]$ApiUrl, [string]$Abis = 'arm64-v8a,armeabi-v7a')
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
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
npx expo prebuild --platform android --no-install
if ($LASTEXITCODE -ne 0) { throw 'Prebuild failed' }
Push-Location android
.\gradlew.bat assembleRelease "-PreactNativeArchitectures=$Abis"
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { throw 'Gradle build failed' }
$version = (Get-Content app.json -Raw | ConvertFrom-Json).expo.version
New-Item -ItemType Directory -Force (Join-Path $root 'dist') | Out-Null
$ondaApiLabel = if ($ondaApiSecure) { 'contabo' } else { 'lan' }
$target = Join-Path $root "dist/ONDA-$version-$ondaApiLabel.apk"
Copy-Item 'android/app/build/outputs/apk/release/app-release.apk' $target -Force
Write-Output "APK: $target (API $ApiUrl)"
