$ErrorActionPreference = "Stop"

$targets = @{
  "AK-ACR-CID12" = "https://akuvoxdealer.com/cdn/shop/files/Akuvox-ACR-CID12-Card-Issuing-Device-for-Akuvox_1024x.jpg?v=1737059361&format=jpg"
  "AK-VP-R49G" = "https://akuvoxdealer.com/cdn/shop/products/akuvox-r49g-ipphone_1024x.jpg?v=1674501918&format=jpg"
  "KYP4060DN" = "https://www.abdofficesolutions.com/cdn/shop/products/Kyocera_ECOSYS_P4060dn_1200x1200.png?v=1727369575"
  "KYPA2600CWX" = "https://www.abdofficesolutions.com/cdn/shop/files/Kyocera_ECOSYS_PA2600cwx_1200x1200.jpg?v=1741797054"
  "KYPA2600CX" = "https://www.abdofficesolutions.com/cdn/shop/files/Kyocera_ECOSYS_PA2600cwx_1200x1200.jpg?v=1741797054"
  "KYPA6000X" = "https://www.abdofficesolutions.com/cdn/shop/files/Kyocera_ECOSYS_PA_6000x_1_1200x1200.png?v=1727369530"
  "SH-SHELLYPROSHUT" = "https://us.shelly.com/cdn/shop/files/Shelly-Pro-Dual-Cover-Shutter-main-image_7bd08d0d-b0da-4504-b978-21edba4fb31c.png?v=1762463558"
}

$outDir = Join-Path (Get-Location) "public\product-images\google\repairs"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$overridesPath = Join-Path (Get-Location) "public\data\google-image-overrides.json"
$overrides = Get-Content -Path $overridesPath -Raw | ConvertFrom-Json
if (-not $overrides.images) {
  $overrides | Add-Member -NotePropertyName images -NotePropertyValue ([pscustomobject]@{})
}

$client = [System.Net.Http.HttpClient]::new()
$client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (compatible; InternextImageRepair/1.0)")
$client.DefaultRequestHeaders.Accept.ParseAdd("image/jpeg")
$client.DefaultRequestHeaders.Accept.ParseAdd("image/png")
$client.DefaultRequestHeaders.Accept.ParseAdd("image/gif")

$report = @()
foreach ($entry in $targets.GetEnumerator()) {
  $code = $entry.Key
  $slug = $code.ToLowerInvariant() -replace "[^a-z0-9]+", "-"
  $fileName = "$slug.jpg"
  $path = Join-Path $outDir $fileName
  $publicUrl = "https://www.internext.com.au/product-images/google/repairs/$fileName"

  $bytes = $client.GetByteArrayAsync($entry.Value).GetAwaiter().GetResult()
  [System.IO.File]::WriteAllBytes($path, $bytes)
  $overrides.images | Add-Member -Force -NotePropertyName $code -NotePropertyValue @($publicUrl)
  $report += [pscustomobject]@{ code = $code; bytes = $bytes.Length; file = $path; url = $publicUrl }
}

$overrides.updatedAt = (Get-Date).ToUniversalTime().ToString("o")
$overrides.reason = "Primary Google Shopping image overrides. Products stay in the feed; invalid, dead, logo, small, and content-negotiated images are replaced with crawlable Internext-hosted product images."
$overrides | ConvertTo-Json -Depth 20 | Set-Content -Path $overridesPath

$reportPath = Join-Path (Get-Location) "reports\google-target-image-localize-report.json"
$report | ConvertTo-Json -Depth 4 | Set-Content -Path $reportPath
$report | Format-Table -AutoSize
