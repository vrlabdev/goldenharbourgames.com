# Shrinks one image to a given width as a JPEG:  powershell -File tools/thumb.ps1 <in> <out> <width>
param([string]$In, [string]$Out, [int]$Width)
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile($In)
$h = [int]([double]$src.Height * $Width / $src.Width)
$dst = New-Object System.Drawing.Bitmap $Width, $h
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($src, 0, 0, $Width, $h)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$p = New-Object System.Drawing.Imaging.EncoderParameters 1
$p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 78L
$dst.Save($Out, $codec, $p)
$g.Dispose(); $dst.Dispose(); $src.Dispose()
