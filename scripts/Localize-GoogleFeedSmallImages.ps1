$ErrorActionPreference = "Stop"

$auditPath = "reports\google-feed-image-audit.json"
$overridesPath = "public\data\google-image-overrides.json"
$outputDir = "public\product-images\google\repairs"
$sitePrefix = "https://www.internext.com.au/product-images/google/repairs"
$minBytes = 15000

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Add-Type -AssemblyName System.Drawing

function Normalize-Code([string]$value) {
  return ($value -replace '[^A-Za-z0-9_-]', '-').Trim('-').ToLowerInvariant()
}

function Save-ResizedImage([string]$sourceUrl, [string]$code) {
  $safeCode = Normalize-Code $code
  $tempPath = Join-Path $outputDir "$safeCode.source"
  $outputPath = Join-Path $outputDir "$safeCode.jpg"

  try {
    Invoke-WebRequest -Uri $sourceUrl -Headers @{ Accept = "image/jpeg,image/png,image/gif,image/*;q=0.8" } -OutFile $tempPath -TimeoutSec 30

    $image = [System.Drawing.Image]::FromFile((Resolve-Path $tempPath))
    try {
      $canvasSize = 900
      $bitmap = New-Object System.Drawing.Bitmap $canvasSize, $canvasSize
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $scale = [Math]::Min(($canvasSize * 0.86) / $image.Width, ($canvasSize * 0.86) / $image.Height)
        $width = [Math]::Max(1, [int]($image.Width * $scale))
        $height = [Math]::Max(1, [int]($image.Height * $scale))
        $x = [int](($canvasSize - $width) / 2)
        $y = [int](($canvasSize - $height) / 2)
        $graphics.DrawImage($image, $x, $y, $width, $height)
      } finally {
        $graphics.Dispose()
      }

      $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" } | Select-Object -First 1
      $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters 1
      $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 92L
      $bitmap.Save((Join-Path (Get-Location) $outputPath), $encoder, $encoderParams)
      $bitmap.Dispose()
    } finally {
      $image.Dispose()
    }

    Remove-Item -Path $tempPath -Force -ErrorAction SilentlyContinue
    return "$sitePrefix/$safeCode.jpg"
  } catch {
    Remove-Item -Path $tempPath -Force -ErrorAction SilentlyContinue
    return $null
  }
}

$audit = Get-Content -Path $auditPath -Raw | ConvertFrom-Json
$overrides = Get-Content -Path $overridesPath -Raw | ConvertFrom-Json
if (-not $overrides.images) {
  $overrides | Add-Member -MemberType NoteProperty -Name images -Value ([pscustomobject]@{})
}

$fixed = @()
$failed = @()
$targets = @($audit.results | Where-Object {
  $_.status -eq 200 -and
  $_.bytes -gt 0 -and
  $_.bytes -lt $minBytes -and
  $_.contentType -match '^image/(jpeg|png|gif)$'
})

foreach ($target in $targets) {
  $url = Save-ResizedImage -sourceUrl $target.image -code $target.id
  if ($url) {
    $overrides.images | Add-Member -Force -MemberType NoteProperty -Name $target.id -Value @($url)
    $fixed += [pscustomobject]@{ code = $target.id; image = $url }
  } else {
    $failed += [pscustomobject]@{ code = $target.id; image = $target.image }
  }
}

$next = [ordered]@{
  updatedAt = (Get-Date).ToUniversalTime().ToString("o")
  source = "reports/google-feed-image-audit.json"
  reason = "Primary Google Shopping image overrides. Products stay in the feed; small crawlable supplier images are localized and resized as Internext-hosted JPEGs."
  images = $overrides.images
}

$next | ConvertTo-Json -Depth 10 | Set-Content -Path $overridesPath

New-Item -ItemType Directory -Force -Path "reports" | Out-Null
@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  fixed = $fixed
  failed = $failed
} | ConvertTo-Json -Depth 6 | Set-Content -Path "reports\google-small-image-localize-report.json"

Write-Host "Localized and resized $($fixed.Count) small images."
Write-Host "Failed $($failed.Count) images."
