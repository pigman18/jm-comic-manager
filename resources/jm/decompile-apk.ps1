param(
    [string]$ApkPath
)

function Write-Step    { param([string]$M); Write-Host "`n>>> $M" -ForegroundColor Cyan }
function Write-Info    { param([string]$M); Write-Host "  $M" -ForegroundColor Gray }
function Write-Success { param([string]$M); Write-Host "  [OK] $M" -ForegroundColor Green }
function Write-Warn    { param([string]$M); Write-Host "  [!] $M" -ForegroundColor Yellow }
function Write-Error   { param([string]$M); Write-Host "  [ERROR] $M" -ForegroundColor Red }

function Get-ToolsDir {
    $d = Join-Path $PSScriptRoot ".tools"
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
    return $d
}

function Get-JavaVersion {
    try {
        $v = java -version 2>&1
        $s = "$($v | Out-String)"
        if ($s -match '"(?:1\.)?(\d+)') { return [int]$Matches[1] }
    } catch {}
    return $null
}

# ============== Tool download functions ==============

function Ensure-Apktool {
    param([string]$ToolsDir)
    $p = Join-Path $ToolsDir "apktool.jar"
    if (Test-Path $p) { Write-Success "apktool.jar found"; return $p }
    Write-Info "Downloading apktool.jar..."
    try {
        Invoke-WebRequest -Uri "https://github.com/iBotPeaches/Apktool/releases/download/v2.9.3/apktool_2.9.3.jar" -OutFile $p -UseBasicParsing
        if (Test-Path $p) { Write-Success "apktool.jar downloaded"; return $p }
    } catch { Write-Error "Failed to download apktool.jar: $_" }
    return $null
}

function Ensure-Jadx {
    param([string]$ToolsDir)
    $jadxDir = Join-Path $ToolsDir "jadx"
    $cli = Join-Path $jadxDir "bin\jadx.bat"
    if (Test-Path $cli) { Write-Success "jadx found"; return $cli }
    Write-Info "Downloading jadx..."
    $zip = Join-Path $ToolsDir "jadx.zip"
    try {
        Invoke-WebRequest -Uri "https://github.com/skylot/jadx/releases/download/v1.5.0/jadx-1.5.0.zip" -OutFile $zip -UseBasicParsing
        Expand-Archive -Path $zip -DestinationPath $jadxDir -Force
        Remove-Item $zip -Force
        if (Test-Path $cli) { Write-Success "jadx downloaded and extracted"; return $cli }
    } catch { Write-Error "Failed to download jadx: $_" }
    return $null
}

# ============== Decompilation functions ==============

function Invoke-Apktool {
    param([string]$ApkPath, [string]$OutputDir, [string]$ApktoolJar)
    $apkDir = Join-Path $OutputDir "apktool"
    if (Test-Path $apkDir) { Write-Info "apktool output exists, skipping..."; return $true }
    Write-Info "Running apktool decode..."
    $r = java -jar $ApktoolJar decode -f -o $apkDir $ApkPath 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Success "apktool decode complete"; return $true }
    Write-Error "apktool failed: $r"; return $false
}

function Invoke-Jadx {
    param([string]$ApkPath, [string]$OutputDir, [string]$JadxCli)
    $jadxDir = Join-Path $OutputDir "jadx"
    if (Test-Path $jadxDir) { Write-Info "jadx output exists, skipping..."; return $true }
    Write-Info "Running jadx decompile (this may take a while)..."
    $r = cmd /c "`"$JadxCli`" --show-bad-code -d `"$jadxDir`" `"$ApkPath`"" 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Success "jadx decompile complete"; return $true }
    Write-Error "jadx failed: $r"; return $false
}

function Invoke-BeautifyWebAssets {
    param([string]$ApktoolDir)

    $assetsBase = Join-Path $ApktoolDir "assets"
    if (-not (Test-Path $assetsBase)) { return $false }

    $webOutput = Join-Path (Split-Path $ApktoolDir -Parent) "webapp"
    if (Test-Path $webOutput) { Write-Info "webapp output exists, skipping..."; return $true }

    # Collect all JS/CSS/HTML files
    $jsFiles = Get-ChildItem -Path $assetsBase -Recurse -Filter "*.js" -ErrorAction SilentlyContinue
    $cssFiles = Get-ChildItem -Path $assetsBase -Recurse -Filter "*.css" -ErrorAction SilentlyContinue
    $htmlFiles = Get-ChildItem -Path $assetsBase -Recurse -Filter "*.html" -ErrorAction SilentlyContinue

    if ($jsFiles.Count -eq 0 -and $cssFiles.Count -eq 0 -and $htmlFiles.Count -eq 0) {
        return $false
    }

    Write-Info "Found web app assets: $($jsFiles.Count) JS, $($cssFiles.Count) CSS, $($htmlFiles.Count) HTML"

    # Copy all assets to webapp/ preserving directory structure
    & robocopy $assetsBase $webOutput /E /NP /NFL /NDL /NJH /NJS > $null 2>&1

    # Check for js-beautify
    $beautifier = Get-Command "js-beautify" -ErrorAction SilentlyContinue
    $npx = Get-Command "npx" -ErrorAction SilentlyContinue
    if (-not $beautifier -and -not $npx) {
        Write-Warn "js-beautify not available (install: npm install -g js-beautify)"
        Write-Info "Web assets copied to webapp/ for manual beautification"
        return $true
    }

    $cmd = if ($beautifier) { $beautifier.Source } else { "npx.cmd" }
    $cmdArgs = if ($beautifier) { @() } else { @("-y", "js-beautify") }

    Write-Info "Beautifying JS files..."
    $beautified = 0; $failed = 0
    foreach ($f in $jsFiles) {
        if ($f.Length -gt 2MB) { Write-Info "  Skipping large: $($f.Name) ($($f.Length/1KB -as [int])KB)"; continue }
        $rel = $f.FullName.Substring($assetsBase.Length + 1)
        $outF = Join-Path $webOutput $rel
        $outD = Split-Path $outF -Parent
        if (-not (Test-Path $outD)) { New-Item -ItemType Directory -Path $outD -Force | Out-Null }
        $args = $cmdArgs + @("-r", "-q", $outF)
        & $cmd @args 2>$null
        if ($LASTEXITCODE -eq 0) { $beautified++ } else { $failed++ }
    }

    Write-Info "Beautifying CSS files..."
    foreach ($f in $cssFiles) {
        $rel = $f.FullName.Substring($assetsBase.Length + 1)
        $outF = Join-Path $webOutput $rel
        $outD = Split-Path $outF -Parent
        if (-not (Test-Path $outD)) { New-Item -ItemType Directory -Path $outD -Force | Out-Null }
        $args = $cmdArgs + @("-r", "-q", "--type", "css", $outF)
        & $cmd @args 2>$null
    }

    Write-Info "Beautifying HTML files..."
    foreach ($f in $htmlFiles) {
        $rel = $f.FullName.Substring($assetsBase.Length + 1)
        $outF = Join-Path $webOutput $rel
        $outD = Split-Path $outF -Parent
        if (-not (Test-Path $outD)) { New-Item -ItemType Directory -Path $outD -Force | Out-Null }
        $args = $cmdArgs + @("-r", "-q", "--type", "html", $outF)
        & $cmd @args 2>$null
    }

    # Check for source maps
    $sourceMaps = Get-ChildItem -Path $webOutput -Recurse -Filter "*.map" -ErrorAction SilentlyContinue
    Write-Success "Web assets: $beautified JS, $($cssFiles.Count) CSS, $($htmlFiles.Count) HTML beautified"
    if ($sourceMaps.Count -gt 0) {
        Write-Info "Found $($sourceMaps.Count) source maps"
    }
    if ($failed -gt 0) { Write-Warn "$failed JS files could not be beautified" }
    return $true
}

function Invoke-SourceMapRestore {
    param([string]$WebAppDir, [string]$OutputDir)

    $mapFiles = Get-ChildItem -Path $WebAppDir -Recurse -Filter "*.map" -ErrorAction SilentlyContinue
    if ($mapFiles.Count -eq 0) { return $false }

    $srcDir = Join-Path $OutputDir "src"
    if (Test-Path $srcDir) { Write-Info "src/ output exists, skipping source map restore..."; return $true }

    New-Item -ItemType Directory -Path $srcDir -Force | Out-Null
    $extractedCount = 0
    $failedMaps = 0

    foreach ($mapFile in $mapFiles) {
        try {
            $json = Get-Content $mapFile.FullName -Raw -Encoding UTF8 -ErrorAction Stop | ConvertFrom-Json
        } catch { $failedMaps++; continue }

        if (-not $json.sources -or -not $json.sourcesContent) { $failedMaps++; continue }

        $sourceRoot = if ($json.sourceRoot) { $json.sourceRoot } else { "" }

        for ($i = 0; $i -lt $json.sources.Count; $i++) {
            $srcPath = $json.sources[$i]
            $srcContent = $json.sourcesContent[$i]
            if (-not $srcPath -or -not $srcContent) { continue }

            # Normalize path: combine sourceRoot, replace forward slashes
            $relPath = if ($sourceRoot) { "$sourceRoot/$srcPath" } else { $srcPath }
            $relPath = $relPath -replace '/', '\'

            # Resolve ../ in path
            $parts = $relPath -split '\\'
            $resolved = @()
            foreach ($part in $parts) {
                if ($part -eq '..' -and $resolved.Count -gt 0) { $resolved = $resolved[0..($resolved.Count-2)] }
                elseif ($part -ne '.' -and $part -ne '') { $resolved += $part }
            }
            if ($resolved.Count -eq 0) { continue }
            $relPath = $resolved -join '\'

            $outPath = Join-Path $srcDir $relPath
            $outParent = Split-Path $outPath -Parent
            if (-not (Test-Path $outParent)) { New-Item -ItemType Directory -Path $outParent -Force | Out-Null }
            try {
                # Avoid overwriting duplicates (same source path in different bundles)
                if (-not (Test-Path $outPath)) {
                    [System.IO.File]::WriteAllText($outPath, $srcContent, [System.Text.Encoding]::UTF8)
                    $extractedCount++
                }
            } catch { }
        }
    }

    if ($extractedCount -gt 0) {
        Write-Success "Source maps restored $extractedCount original source files to src/"
    }
    if ($failedMaps -gt 0) { Write-Warn "$failedMaps source maps had no sourcesContent" }
    return ($extractedCount -gt 0)
}

function Invoke-AssetOrganization {
    param([string]$ApktoolDir, [string]$OutputDir)

    $assetDir = Join-Path $ApktoolDir "assets"
    if (-not (Test-Path $assetDir)) { return $false }

    $assetsOut = Join-Path $OutputDir "extracted_assets"
    if (Test-Path $assetsOut) { return $true }

    New-Item -ItemType Directory -Path $assetsOut -Force | Out-Null

    # Copy all non-code assets to flat structure for easy browsing
    $imageExts = @(".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico")
    $imageFiles = Get-ChildItem -Path $assetDir -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { [System.IO.Path]::GetExtension($_.Name).ToLower() -in $imageExts }

    $imgDir = Join-Path $assetsOut "images"
    if ($imageFiles.Count -gt 0) {
        New-Item -ItemType Directory -Path $imgDir -Force | Out-Null
        foreach ($f in $imageFiles) {
            Copy-Item -Path $f.FullName -Destination (Join-Path $imgDir $f.Name) -Force -ErrorAction SilentlyContinue
        }
        Write-Info "Copied $($imageFiles.Count) images to extracted_assets/images/"
    }

    return $true
}

function Write-AnalysisSummary {
    param([string]$ApkName, [string]$OutputDir, [string]$ApktoolDir)

    $summaryPath = Join-Path $OutputDir "decompile-summary.txt"
    $lines = @(
        "================================================================================",
        " APK Decompile Summary",
        "================================================================================",
        "Source APK : $ApkName",
        "Output Dir : $OutputDir",
        "Date       : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
        "--------------------------------------------------------------------------------",
        "1. APKTOOL - App Resources & Smali Bytecode",
        "--------------------------------------------------------------------------------"
    )

    if (Test-Path $ApktoolDir) {
        $mf = Join-Path $ApktoolDir "AndroidManifest.xml"
        if (Test-Path $mf) {
            $pkg = Select-String -Path $mf 'package="([^"]+)"' | ForEach-Object { $_.Matches.Groups[1].Value }
            if ($pkg) { $lines += "  Package : $pkg" }
        }
        if (Test-Path (Join-Path $ApktoolDir "res")) {
            $resCount = @(Get-ChildItem -Path (Join-Path $ApktoolDir "res") -Recurse -File -ErrorAction SilentlyContinue).Count
            $lines += "  res/    : $resCount resource files"
        }
        if (Test-Path (Join-Path $ApktoolDir "smali")) {
            $smaliCount = @(Get-ChildItem -Path (Join-Path $ApktoolDir "smali") -Recurse -Filter "*.smali" -ErrorAction SilentlyContinue).Count
            $lines += "  smali/  : $smaliCount .smali files (Dalvik bytecode)"
        }
        if (Test-Path (Join-Path $ApktoolDir "lib")) {
            $libs = @(Get-ChildItem -Path (Join-Path $ApktoolDir "lib") -Recurse -Filter "*.so" -ErrorAction SilentlyContinue)
            if ($libs.Count -gt 0) {
                $archs = ($libs | Group-Object { $_.Directory.Parent.Name } | ForEach-Object { "$($_.Name)($($_.Count))" }) -join ", "
                $lines += "  lib/    : $($libs.Count) native libs [$archs]"
            }
        }
        if (Test-Path (Join-Path $ApktoolDir "assets")) {
            $assetCount = @(Get-ChildItem -Path (Join-Path $ApktoolDir "assets") -Recurse -File -ErrorAction SilentlyContinue).Count
            $lines += "  assets/ : $assetCount files"
        }
        $lines += ""
    }

    # Web app info
    $webOut = Join-Path $OutputDir "webapp"
    if (Test-Path $webOut) {
        $lines += "--------------------------------------------------------------------------------"
        $lines += "2. WEB APP (Capacitor/Cordova) - Decompiled Web Frontend"
        $lines += "--------------------------------------------------------------------------------"
        $jsCount = @(Get-ChildItem -Path $webOut -Recurse -Filter "*.js" -ErrorAction SilentlyContinue).Count
        $cssCount = @(Get-ChildItem -Path $webOut -Recurse -Filter "*.css" -ErrorAction SilentlyContinue).Count
        $htmlCount = @(Get-ChildItem -Path $webOut -Recurse -Filter "*.html" -ErrorAction SilentlyContinue).Count
        $lines += "  Files: $jsCount JS, $cssCount CSS, $htmlCount HTML"
        $smCount = @(Get-ChildItem -Path $webOut -Recurse -Filter "*.map" -ErrorAction SilentlyContinue).Count
        if ($smCount -gt 0) { $lines += "  Source maps: $smCount (can restore original source)" }
        $lines += ""
    }

    # Source map restore info
    $srcOut = Join-Path $OutputDir "src"
    if (Test-Path $srcOut) {
        $lines += "--------------------------------------------------------------------------------"
        $lines += "3. SOURCE MAP RESTORE - Original TypeScript/React Source"
        $lines += "--------------------------------------------------------------------------------"
        $tsCount = @(Get-ChildItem -Path $srcOut -Recurse -Include "*.ts", "*.tsx" -ErrorAction SilentlyContinue).Count
        $jsCountSM = @(Get-ChildItem -Path $srcOut -Recurse -Filter "*.js" -ErrorAction SilentlyContinue).Count
        $cssCountSM = @(Get-ChildItem -Path $srcOut -Recurse -Filter "*.css" -ErrorAction SilentlyContinue).Count
        $htmlCountSM = @(Get-ChildItem -Path $srcOut -Recurse -Filter "*.html" -ErrorAction SilentlyContinue).Count
        $parts = @()
        if ($tsCount -gt 0) { $parts += "$tsCount .ts/.tsx" }
        if ($jsCountSM -gt 0) { $parts += "$jsCountSM .js" }
        if ($cssCountSM -gt 0) { $parts += "$cssCountSM .css" }
        if ($htmlCountSM -gt 0) { $parts += "$htmlCountSM .html" }
        if ($parts.Count -gt 0) { $lines += "  $($parts -join ', ') files" }
        $lines += ""
    }

    # Jadx info
    $jadxOut = Join-Path $OutputDir "jadx"
    if (Test-Path $jadxOut) {
        $lines += "--------------------------------------------------------------------------------"
        $lines += "4. JADX - Java Source Code (from DEX)"
        $lines += "--------------------------------------------------------------------------------"
        $srcDir2 = Join-Path $jadxOut "sources"
        if (Test-Path $srcDir2) {
            $javaCount = @(Get-ChildItem -Path $srcDir2 -Recurse -Filter "*.java" -ErrorAction SilentlyContinue).Count
            $lines += "  $javaCount .java files"
        }
        $lines += ""
    }

    # Extracted assets
    $extractedAssets = Join-Path $OutputDir "extracted_assets"
    if (Test-Path $extractedAssets) {
        $lines += "--------------------------------------------------------------------------------"
        $lines += "5. EXTRACTED ASSETS"
        $lines += "--------------------------------------------------------------------------------"
        $imgCount = @(Get-ChildItem -Path (Join-Path $extractedAssets "images") -File -ErrorAction SilentlyContinue).Count
        if ($imgCount -gt 0) { $lines += "  $imgCount images" }
        $lines += ""
    }

    $lines += "================================================================================"
    $lines += "DIRECTORY STRUCTURE"
    $lines += "================================================================================"
    $lines += "  $(Split-Path $OutputDir -Leaf)/"
    if (Test-Path (Join-Path $OutputDir "apktool"))    { $lines += "  +-- apktool/            (Android resources, smali, assets)" }
    if (Test-Path (Join-Path $OutputDir "src"))        { $lines += "  +-- src/                (original TypeScript/React source from maps)" }
    if (Test-Path (Join-Path $OutputDir "webapp"))     { $lines += "  +-- webapp/             (beautified web frontend JS/CSS/HTML)" }
    if (Test-Path (Join-Path $OutputDir "jadx"))       { $lines += "  +-- jadx/               (Java source code from DEX)" }
    if (Test-Path (Join-Path $OutputDir "extracted_assets")) { $lines += "  +-- extracted_assets/   (images and media files)" }
    $lines += "  +-- decompile-summary.txt"
    $lines += "================================================================================"

    $lines -join "`r`n" | Out-File -FilePath $summaryPath -Encoding utf8
    Write-Success "Summary written to decompile-summary.txt"
}

# ========================= MAIN =========================

Clear-Host
Write-Host "================================================================================" -ForegroundColor Magenta
Write-Host "  APK Decompiler - apktool + jadx + Web Beautifier" -ForegroundColor Magenta
Write-Host "================================================================================" -ForegroundColor Magenta

if (-not $ApkPath) {
    Write-Error "No APK file specified."
    Write-Host "`nUsage: drag an APK file onto this script, or run:" -ForegroundColor Yellow
    Write-Host "  .\decompile-apk.ps1 <path-to-apk>" -ForegroundColor Yellow
    pause; exit 1
}

if (-not (Test-Path $ApkPath)) { Write-Error "File not found: $ApkPath"; pause; exit 1 }

$ApkPath = (Resolve-Path $ApkPath).Path
$ApkName = Split-Path $ApkPath -Leaf
$BaseName = [System.IO.Path]::GetFileNameWithoutExtension($ApkName)

Write-Step "APK: $ApkName"

$OutputDir = Join-Path (Split-Path $ApkPath -Parent) "${BaseName}_decompiled"
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null }
Write-Info "Output: $OutputDir"

$ToolsDir = Get-ToolsDir
$hasNode = Get-Command "node" -ErrorAction SilentlyContinue

# Step 1: Check Java
Write-Step "[Phase 1] Checking Java..."
$javaVersion = Get-JavaVersion
if (-not $javaVersion) { Write-Error "Java not found. Install Java 8+ from https://adoptium.net/"; pause; exit 1 }

if ($javaVersion -ge 8)  { Write-Success "Java $javaVersion detected (apktool OK)" }
if ($javaVersion -ge 11) { Write-Success "Java $javaVersion detected (jadx OK)" }
if ($javaVersion -lt 11) { Write-Info "Java 11+ not found (current: $javaVersion). jadx will be skipped." }
if (-not $hasNode) { Write-Info "Node.js not found. Web beautification will be skipped." }

# Step 2: Ensure tools
Write-Step "[Phase 2] Ensuring tools..."
$apktoolJar = $null
$jadxCli = $null
if ($javaVersion -ge 8)  { $apktoolJar = Ensure-Apktool -ToolsDir $ToolsDir }
if ($javaVersion -ge 11) { $jadxCli = Ensure-Jadx -ToolsDir $ToolsDir }

# Step 3: Decompile with apktool
if ($apktoolJar) {
    Write-Step "[Phase 3] apktool - Resources & Smali..."
    $apktoolOk = Invoke-Apktool -ApkPath $ApkPath -OutputDir $OutputDir -ApktoolJar $apktoolJar
}

$apktoolDir = Join-Path $OutputDir "apktool"

# Step 4: Decompile with jadx
if ($jadxCli) {
    Write-Step "[Phase 4] jadx - Java Source Code..."
    $jadxOk = Invoke-Jadx -ApkPath $ApkPath -OutputDir $OutputDir -JadxCli $jadxCli
}

# Step 5: Beautify web assets (Capacitor/Cordova/WebView apps)
$webappDir = Join-Path $OutputDir "webapp"
if ($apktoolOk -and $hasNode) {
    Write-Step "[Phase 5] Web app beautification..."
    $webOk = Invoke-BeautifyWebAssets -ApktoolDir $apktoolDir
}

# Step 6: Restore original source from source maps
if ($webOk -and (Test-Path $webappDir)) {
    Write-Step "[Phase 6] Restoring original source from source maps..."
    $srcOk = Invoke-SourceMapRestore -WebAppDir $webappDir -OutputDir $OutputDir
}

# Step 7: Extract media assets
if ($apktoolOk) {
    Write-Step "[Phase 7] Extracting media assets..."
    $mediaOk = Invoke-AssetOrganization -ApktoolDir $apktoolDir -OutputDir $OutputDir
}

# Step 7: Summary
Write-Step "[Done] Writing summary..."
Write-AnalysisSummary -ApkName $ApkName -OutputDir $OutputDir -ApktoolDir $apktoolDir

# Final output
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "  Decompile complete!" -ForegroundColor Green
Write-Host "  Output: $OutputDir" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green

Write-Host "`nOutput structure:" -ForegroundColor Yellow
Write-Host "  ${BaseName}_decompiled/" -ForegroundColor Yellow
if (Test-Path (Join-Path $OutputDir "apktool"))    { Write-Host "  +-- apktool/            (Android resources, smali, AndroidManifest.xml)" -ForegroundColor Yellow }
if (Test-Path (Join-Path $OutputDir "src"))        { Write-Host "  +-- src/                (original TypeScript/React source from maps)" -ForegroundColor Yellow }
if (Test-Path (Join-Path $OutputDir "webapp"))     { Write-Host "  +-- webapp/             (beautified web frontend JS/CSS/HTML)" -ForegroundColor Yellow }
if (Test-Path (Join-Path $OutputDir "jadx"))       { Write-Host "  +-- jadx/               (Java source code from DEX)" -ForegroundColor Yellow }
if (Test-Path (Join-Path $OutputDir "extracted_assets")) { Write-Host "  +-- extracted_assets/   (images and media files)" -ForegroundColor Yellow }
Write-Host "  +-- decompile-summary.txt" -ForegroundColor Yellow

pause
