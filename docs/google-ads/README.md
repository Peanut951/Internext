# Google Ads Campaign Package

This folder contains the paused Internext Performance Max launch campaign:

- `internext-performance-max-launch.md`: setup, verification, launch, and operating rules
- `campaign-settings.csv`: campaign and asset-group settings
- `text-assets.csv`: headlines, long headlines, and descriptions
- `search-themes.csv`: initial search themes
- `negative-keywords.csv`: campaign-level negative keyword list
- `url-exclusions.csv`: paths excluded from Final URL expansion
- `sitelinks.csv`: category links and descriptions
- `callouts.csv`: short, factual campaign callouts
- `audience-signals.csv`: first-party audience definitions to add when available
- `promotion-settings.csv`: Merchant Center first-order promotion settings
- `launch-audit.md`: results from the latest supplier-backed feed and build check
- `image-assets.csv`: generated campaign imagery, dimensions, and upload types

The product feed supplies real product images and uses `custom_label_3=launch_ready` to keep
out-of-stock products and products without complete package measurements out of the campaign.

The ten campaign images are stored in `public/google-ads/internext-launch/`. They are AI-generated
category-level marketing images, so select Google's AI-generated-content label when uploading them.
They must not replace the real SKU images supplied through Merchant Center.

Create the campaign in the correct Google Ads account, attach the existing Merchant Center account,
and leave the campaign paused until every gate in `internext-performance-max-launch.md` passes.
