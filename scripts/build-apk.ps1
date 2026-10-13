param([Parameter(Mandatory = $true)][string]$ApiUrl, [string]$Abis = 'arm64-v8a,armeabi-v7a')
# Test APK for a physical phone on the local network: release JS bundle embedded (no Metro), API over HTTP on the LAN.
# Signed with the debug key from the generated Android project; not for store distribution.
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location (Join-Path $root 'apps/mobile')
$env:APP_VARIANT = 'development'      # enables cleartext HTTP for the LAN API
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
$target = Join-Path $root "dist/ONDA-$version-lan.apk"
Copy-Item 'android/app/build/outputs/apk/release/app-release.apk' $target -Force
Write-Output "APK: $target (API $ApiUrl)"
