$ErrorActionPreference = "Stop"

$targets = @{
  "AK-ACR-CID12" = "https://akuvoxdealer.com/cdn/shop/files/Akuvox-ACR-CID12-Card-Issuing-Device-for-Akuvox_1024x.jpg?v=1737059361&format=jpg"
  "AK-VP-R49G" = "https://akuvoxdealer.com/cdn/shop/products/akuvox-r49g-ipphone_1024x.jpg?v=1674501918&format=jpg"
  "KYP4060DN" = "https://www.abdofficesolutions.com/cdn/shop/products/Kyocera_ECOSYS_P4060dn_1200x1200.png?v=1727369575"
  "KYPA2600CWX" = "https://www.abdofficesolutions.com/cdn/shop/files/Kyocera_ECOSYS_PA2600cwx_1200x1200.jpg?v=1741797054"
  "KYPA2600CX" = "https://www.abdofficesolutions.com/cdn/shop/files/Kyocera_ECOSYS_PA2600cwx_1200x1200.jpg?v=1741797054"
  "KYPA6000X" = "https://www.abdofficesolutions.com/cdn/shop/files/Kyocera_ECOSYS_PA_6000x_1_1200x1200.png?v=1727369530"
  "LG-WP601-B" = "https://www.lg.com/content/dam/channel/wcms/za/images/business/feature/wp601-b/WP601-Gallery-450-01-webOS-Box-Digital-Signage-ID.jpg"
  "LM47C9667" = "https://i5.walmartimages.com/seo/Lexmark-CX735adse-Laser-Multifunction-Printer-Color-TAA-Compliant_9d49a7c6-7b28-474f-a84e-83f6531afba3.8a2697c1f93a8d4088f906994fdafbdf.jpeg"
  "LMMX532ADWE" = "https://i5.walmartimages.com/seo/Lexmark-MX532adwe-MFP-Mono-Laser-Printer-46-ppm-1200-x-1200-2-GB-1-2GHz_085d5a27-612a-47eb-bd4d-2e076f6f6b1a.88b1c011ab6bad1356ee36a8a5c2352c.jpeg"
  "NB-T70" = "https://www.pbtech.com/pacific/imgprod/T/A/TAANBY1027__1.jpg?h=481507840"
  "SH-SHELLYPROSHUT" = "https://us.shelly.com/cdn/shop/files/Shelly-Pro-Dual-Cover-Shutter-main-image_7bd08d0d-b0da-4504-b978-21edba4fb31c.png?v=1762463558"
}

$outDir = Join-Path (Get-Location) "public\product-images\google\repairs"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$overridesPath = Join-Path (Get-Location) "public\data\google-image-overrides.json"
$overrides = Get-Content -Path $overridesPath -Raw | ConvertFrom-Json
if (-not $overrides.images) {
  $overrides | Add-Member -NotePropertyName images -NotePropertyValue ([pscustomobject]@{})
}

$client = [System.Net.WebClient]::new()
$client.Headers.Add("User-Agent", "Mozilla/5.0 (compatible; InternextImageRepair/1.0)")
$client.Headers.Add("Accept", "image/jpeg,image/png,image/gif,image/*;q=0.8")

$report = @()
foreach ($entry in $targets.GetEnumerator()) {
  $code = $entry.Key
  $slug = $code.ToLowerInvariant() -replace "[^a-z0-9]+", "-"
  $fileName = "$slug.jpg"
  $path = Join-Path $outDir $fileName
  $publicUrl = "https://www.internext.com.au/product-images/google/repairs/$fileName"

  $bytes = $client.DownloadData($entry.Value)
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
