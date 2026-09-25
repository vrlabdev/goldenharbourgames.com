# Renders the pictures the site cannot draw for itself:  powershell -File tools/render_images.ps1
#   img/og-<lang>.jpg        1200x630, the card a link shows in chats and on social sites
#   img/apple-touch-icon.png 180x180, the icon a phone puts on its home screen
# Run node tools/build.mjs first: it writes the .cache/ pages these are pictures of.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$cache = Join-Path $root '.cache'
$img = Join-Path $root 'img'
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw 'Microsoft Edge not found' }

function Shoot($page, $png, $w, $h) {
  $url = 'file:///' + ($page -replace '\\', '/').Replace(' ', '%20')
  $profile = Join-Path $cache 'edge-profile'
  # Start-Process joins the arguments with spaces and quotes none of them: a path with a space in
  # it (this project lives under "GAMEDEV PROJECTS") has to carry its own quotes.
  Start-Process -FilePath $edge -Wait -WindowStyle Hidden -ArgumentList @(
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    "--user-data-dir=`"$profile`"", "--window-size=$w,$h", '--virtual-time-budget=6000', "--screenshot=`"$png`"", $url)
  if (-not (Test-Path $png)) { throw "Edge wrote no screenshot of $page" }
}

function Save($png, $out, $w, $h, $jpeg) {
  $src = [System.Drawing.Image]::FromFile($png)
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $w, $h)), (New-Object System.Drawing.Rectangle(0, 0, [Math]::Min($src.Width, $(if ($jpeg) { 1200 } else { 540 })), [Math]::Min($src.Height, $(if ($jpeg) { 630 } else { 540 })))), 'Pixel')
  $g.Dispose(); $src.Dispose()
  if ($jpeg) {
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $p = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]88)
    $bmp.Save($out, $codec, $p)
  } else {
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  $bmp.Dispose()
  Write-Host "wrote $out"
}

foreach ($page in Get-ChildItem $cache -Filter 'og-*.html') {
  $lang = $page.BaseName.Substring(3)
  $png = Join-Path $cache "og-$lang.png"
  Shoot $page.FullName $png 1200 630
  Save $png (Join-Path $img "og-$lang.jpg") 1200 630 $true
}
$png = Join-Path $cache 'icon.png'
Shoot (Join-Path $cache 'icon.html') $png 540 540
Save $png (Join-Path $img 'apple-touch-icon.png') 180 180 $false
