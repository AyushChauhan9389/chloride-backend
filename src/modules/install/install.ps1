# Chloride — all-in-one DevOps utils CLI
#
#   irm https://chloride.carbonkit.tech/install.ps1 | iex
#
# Env:
#   CL_INSTALL_DIR   where to put the binary (default: %LOCALAPPDATA%\Programs\Chloride)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'  # Invoke-WebRequest is ~10x faster without the bar

$Repo    = 'ayushChauhan9389/chloride'
$Asset   = 'cl-x86_64-pc-windows-msvc.exe'
$BaseUrl = "https://github.com/$Repo/releases/latest/download"
$Dir     = if ($env:CL_INSTALL_DIR) { $env:CL_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'Programs\Chloride' }

Write-Host ''
Write-Host '  🧪 Chloride' -ForegroundColor Cyan -NoNewline
Write-Host ' — all-in-one DevOps utils CLI' -ForegroundColor DarkGray
Write-Host ''

if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64' -and $env:PROCESSOR_ARCHITEW6432 -ne 'AMD64') {
    throw "unsupported architecture: $env:PROCESSOR_ARCHITECTURE (only x64 is published today)"
}

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("chloride-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

try {
    $exe = Join-Path $tmp 'cl.exe'

    Write-Host '⬇  fetching the latest release…' -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri "$BaseUrl/$Asset" -OutFile $exe -UseBasicParsing
    } catch {
        throw "download failed. Check that a release exists: https://github.com/$Repo/releases/latest"
    }

    # Verify against the published checksum. A missing checksum is tolerated
    # (older releases); a mismatching one never is.
    $expected = $null
    try {
        $sumFile = Join-Path $tmp 'cl.sha256'
        Invoke-WebRequest -Uri "$BaseUrl/$Asset.sha256" -OutFile $sumFile -UseBasicParsing
        $expected = ((Get-Content $sumFile -Raw).Trim() -split '\s+')[0]
    } catch {
        Write-Host '   no checksum published for this release — skipping verification' -ForegroundColor DarkGray
    }
    if ($expected) {
        $actual = (Get-FileHash $exe -Algorithm SHA256).Hash.ToLower()
        if ($expected.ToLower() -ne $actual) {
            throw "checksum mismatch — refusing to install.`n  expected $expected`n  got      $actual"
        }
    }

    New-Item -ItemType Directory -Path $Dir -Force | Out-Null
    $target = Join-Path $Dir 'cl.exe'
    try {
        Move-Item -Path $exe -Destination $target -Force
    } catch {
        throw "cannot write to $Dir — close any running 'cl' and try again, or set CL_INSTALL_DIR."
    }

    $version = try { & $target --version 2>$null } catch { 'cl' }
    Write-Host ''
    Write-Host '✔  installed ' -ForegroundColor Green -NoNewline
    Write-Host "$version" -NoNewline
    Write-Host " → $target"

    # Add to the user PATH (not the machine one — no admin needed).
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ($userPath -notlike "*$Dir*") {
        $joined = if ([string]::IsNullOrEmpty($userPath)) { $Dir } else { "$userPath;$Dir" }
        [Environment]::SetEnvironmentVariable('Path', $joined, 'User')
        Write-Host ''
        Write-Host "   added $Dir to your user PATH" -ForegroundColor DarkGray
        Write-Host '   open a new terminal, then run ' -ForegroundColor DarkGray -NoNewline
        Write-Host 'cl' -NoNewline
        Write-Host ' to get started' -ForegroundColor DarkGray
    } else {
        Write-Host ''
        Write-Host '   run ' -ForegroundColor DarkGray -NoNewline
        Write-Host 'cl' -NoNewline
        Write-Host ' to get started, ' -ForegroundColor DarkGray -NoNewline
        Write-Host 'cl login' -NoNewline
        Write-Host ' to sign in' -ForegroundColor DarkGray
    }
    # Make it usable in this session too.
    $env:Path = "$env:Path;$Dir"
    Write-Host ''
} finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
