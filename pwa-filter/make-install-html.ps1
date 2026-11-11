# Vygeneruje pwa-task-filter.install.html z pwa-task-filter.min.txt.
# Spustenie:  pwsh -File make-install-html.ps1
# Bookmark sa potom inštaluje potiahnutím odkazu z otvorenej stránky na panel obľúbených
# (dialóg "Pridať obľúbenú položku" má limit dĺžky URL, drag & drop nie).

$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$min = (Get-Content (Join-Path $dir 'pwa-task-filter.min.txt') -Raw).Trim()
$href = [System.Net.WebUtility]::HtmlEncode($min)

$html = @"
<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="utf-8">
<title>PWA filter — inštalácia bookmarkletu</title>
<style>
  body { font: 14px 'Segoe UI', sans-serif; max-width: 640px; margin: 40px auto; color: #333; }
  a.bm { display: inline-block; padding: 10px 22px; background: #0072c6; color: #fff;
         text-decoration: none; border-radius: 4px; font-weight: bold; cursor: grab; }
  ol li { margin: 6px 0; }
  .note { color: #666; font-size: 12px; }
</style>
</head>
<body>
<h1>PWA filter</h1>
<p><a class="bm" href="$href">PWA filter</a></p>
<ol>
  <li>Zobraz si panel obľúbených (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>).</li>
  <li><b>Potiahni modré tlačidlo myšou</b> na panel obľúbených. (Neklikať — klik by sa pokúsil skript spustiť tu.)</li>
  <li>Starú verziu záložky predtým zmaž, ak existuje.</li>
</ol>
<p class="note">Stránka vygenerovaná skriptom make-install-html.ps1 z pwa-task-filter.min.txt
— po každej zmene skriptu ju treba vygenerovať a záložku pretiahnuť znova.</p>
</body>
</html>
"@

$out = Join-Path $dir 'pwa-task-filter.install.html'
Set-Content -Path $out -Value $html -Encoding UTF8
Write-Host "Vygenerované: $out ($((Get-Item $out).Length) B)"
