param(
    [Parameter(Mandatory=$true)][string]$ApkPath,
    [Parameter(Mandatory=$true)][string]$SdkPath,
    [Parameter(Mandatory=$true)][string]$ApiOrigin
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$apk = (Resolve-Path -LiteralPath $ApkPath).Path
$aapt = Join-Path $SdkPath 'build-tools\36.0.0\aapt.exe'
$badging = & $aapt dump badging $apk
if ($LASTEXITCODE -ne 0) { throw 'APK manifest verification failed.' }
if (-not ($badging -match "package: name='com.gcsc.smartcontractor' versionCode='6' versionName='0.1.4'")) {
    throw 'Unexpected APK package/version; do not install.'
}
if ($badging -match '^application-debuggable') { throw 'APK still requires developer-mode acceptance.' }
if (-not ($badging -match "native-code: 'arm64-v8a'")) { throw 'APK does not include Pixel 8 native libraries.' }
$zip = [IO.Compression.ZipFile]::OpenRead($apk)
try {
    $entry = $zip.GetEntry('assets/index.android.bundle')
    if ($null -eq $entry -or $entry.Length -lt 1024) { throw 'Embedded JavaScript bundle is missing.' }
    $stream = $entry.Open()
    $memory = New-Object IO.MemoryStream
    try {
        $stream.CopyTo($memory)
        $text = [Text.Encoding]::UTF8.GetString($memory.ToArray())
        if (-not $text.Contains($ApiOrigin)) { throw 'Expected API origin is not embedded in APK.' }
        if ($text.Contains('https://gcsc-backend-production.up.railway.app')) { throw 'Legacy production API found in local APK.' }
    } finally { $stream.Dispose(); $memory.Dispose() }
} finally { $zip.Dispose() }
& (Join-Path $SdkPath 'build-tools\36.0.0\apksigner.bat') verify $apk
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
[pscustomobject]@{
    Apk=$apk; Version='0.1.4'; VersionCode=6; ApiOrigin=$ApiOrigin
    Bytes=(Get-Item -LiteralPath $apk).Length
    SHA256=(Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant()
    Scope='Local USB test APK. Not wallet/payment/device acceptance.'
} | ConvertTo-Json
