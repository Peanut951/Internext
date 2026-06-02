import fs from "fs";

const dataPath = "public/data/leader-products.json";
const existingProducts = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const existingCodes = new Set(existingProducts.flatMap((item) => [item.code, item.supplierCode].filter(Boolean)));

const products = [
  // Page 1 featured systems and Ubiquiti
  ["SCT4-Z1-R5P", "Leader Companion SCT4-Z1 2-in-1 Convertible", 1699, "Leader", "Notebooks", "14 inch FHD touch convertible notebook with AMD Ryzen 5 7430U, 16GB DDR4, 1TB NVMe SSD, backlit keyboard, active pen and Windows 11 Pro.", "/images/leader/leader-convertible.jpg"],
  ["TBL-10W5PRO", "Leader 10W5PRO 2-in-1 Tablet", 499, "Leader", "Tablets", "10.5 inch Full HD touch tablet with Intel Celeron N4020, 4GB DDR4, 128GB eMMC, detachable keyboard, active pen and Windows 11 Pro.", "/images/leader/leader-2in1-tablet.jpg"],
  ["SCP4-H2-R5P", "Leader Companion SCP4-H2 14 inch Notebook", 1329, "Leader", "Notebooks", "14 inch Full HD notebook with AMD Ryzen 5 7430U, 16GB DDR4, 512GB SSD, AMD Radeon graphics, backlit keyboard and Windows 11 Pro.", "/images/leader/leader-notebook-14.jpg"],
  ["SV245-I5H", "Leader Visionary AIO 23.8 inch i5", 1599, "Leader", "All-in-One PCs", "23.8 inch Full HD all-in-one PC with Intel Core i5-13420H, 16GB DDR4, 1TB M.2 NVMe SSD, pop-up camera, fingerprint and Windows 11 Home.", "/images/leader/leader-aio.jpg"],
  ["SN17-I5", "Leader Corporate N17 i5 Mini PC", 1699, "Leader", "Mini PCs", "Corporate N17 mini PC with Intel Core i5-13420H, 16GB DDR5, 1TB M.2 NVMe SSD, Iris Xe graphics, Wi-Fi 6E, VESA mount and Windows 11 Pro.", "/images/leader/leader-mini-pc.jpg"],
  ["NHU-UMR-ULTRA", "Ubiquiti Mobile Router Ultra", 209, "Ubiquiti", "Networking", "Ultra-compact managed LTE mobile router for IoT applications with integrated Wi-Fi, WAN failover and DC power input support.", "/product-placeholder.svg"],
  ["NHU-UCG-FIBER", "Ubiquiti Cloud Gateway Fiber", 569, "Ubiquiti", "Networking", "Desktop 10G cloud gateway with integrated PoE switch, selectable NVR storage and full UniFi application support.", "/product-placeholder.svg"],
  ["NHU-UDR7", "Ubiquiti Dream Router 7", 589, "Ubiquiti", "Networking", "10G cloud gateway with integrated Wi-Fi 7, PoE switch, microSD storage and full UniFi application support.", "/product-placeholder.svg"],
  ["NHU-UCG-MAX", "Ubiquiti Cloud Gateway Max", 599, "Ubiquiti", "Networking", "Compact 2.5G cloud gateway supporting 30+ UniFi devices, 300+ clients, 1.5Gbps IPS routing and 512GB NVMe SSD.", "/product-placeholder.svg"],
  ["NHU-UVC-AI-PRO-W", "Ubiquiti AI Professional Camera White", 1059, "Ubiquiti", "Security Cameras", "UniFi Protect indoor/outdoor 4K PoE camera in white with IP65 weather resistance, PoE+ power and GbE RJ45 port.", "/product-placeholder.svg"],

  // Page 2/3 notebooks
  ["SCU6-C2-U732H", "Leader AI Companion SCU6-C2 16 inch Notebook U7", 3099, "Leader", "Notebooks", "16 inch QHD+ notebook with Intel Core Ultra 7 258V, 32GB DDR5, 1TB M.2 NVMe SSD, Arc 140V graphics, Wi-Fi 6E and Windows 11 Home.", "/images/leader/leader-ai-notebook.png"],
  ["SCE5-H2-C8P", "Leader Companion SCE5-H2 15.6 inch Notebook", 699, "Leader", "Notebooks", "15.6 inch Full HD notebook with Intel Celeron N4500, 8GB DDR4, 128GB M.2 NVMe SSD, full-size keyboard and Windows 11 Pro.", "/images/leader/leader-notebook-15.jpg"],
  ["SCP5-H2-R5P", "Leader Companion SCP5-H2 15.6 inch Notebook", 1299, "Leader", "Notebooks", "15.6 inch Full HD notebook with AMD Ryzen 5 7430U, 16GB DDR4, 512GB SSD, fingerprint, backlit keyboard and Windows 11 Pro.", "/images/leader/leader-notebook-15.jpg"],
  ["SCP5-C2-I5H", "Leader Companion Plus SCP5-C2 15.6 inch Notebook i5", 1699, "Leader", "Notebooks", "15.6 inch Full HD notebook with Intel Core 5 120U, 16GB DDR4, 1TB M.2 NVMe SSD, Iris Xe graphics, Wi-Fi 6E and Windows 11 Home.", "/images/leader/leader-notebook-15.jpg"],
  ["SCP5-C2-I7H", "Leader Companion Plus SCP5-C2 15.6 inch Notebook i7", 2099, "Leader", "Notebooks", "15.6 inch Full HD notebook with Intel Core 7 150U, 32GB DDR4, 1TB M.2 NVMe SSD, Iris Xe graphics, Wi-Fi 6E and Windows 11 Home.", "/images/leader/leader-notebook-15.jpg"],
  ["SCP6-C1-A5H", "Leader AI Companion SCP6-C1 16 inch Notebook A5", 2099, "Leader", "Notebooks", "16 inch Full HD+ notebook with AMD Ryzen AI 5 340, 16GB DDR5, 1TB NVMe SSD, Radeon graphics, Wi-Fi 6E and Windows 11 Home.", "/images/leader/leader-ai-notebook.png"],
  ["SCP6-C1-A7P", "Leader AI Companion SCP6-C1 16 inch Notebook A7", 2299, "Leader", "Notebooks", "16 inch Full HD+ notebook with AMD Ryzen AI 7 350, 16GB DDR5, 1TB NVMe SSD, Radeon graphics, Wi-Fi 6E and Windows 11 Home.", "/images/leader/leader-ai-notebook.png"],
  ["SCP6-C1-A9H", "Leader AI Companion SCP6-C1 16 inch Notebook A9", 2299, "Leader", "Notebooks", "16 inch Full HD+ notebook with AMD Ryzen AI 9 HX 370, 16GB DDR5, 1TB NVMe SSD, Radeon graphics and Windows 11 Home.", "/images/leader/leader-ai-notebook.png"],
  ["SCU6-C2-U516H", "Leader AI Companion SCU6-C2 16 inch Notebook U5", 2649, "Leader", "Notebooks", "16 inch QHD+ notebook with Intel Core Ultra 5 226V, 16GB DDR4, 1TB NVMe SSD, Arc 130V graphics and Windows 11 Home.", "/images/leader/leader-ai-notebook.png"],
  ["SCP6-C1-A7GP", "Leader AI Companion SCP6-C1 16 inch Notebook A7 RTX", 3299, "Leader", "Notebooks", "16 inch QHD+ notebook with AMD Ryzen AI 7 350, 32GB DDR5, 1TB NVMe SSD, RTX 5060 8GB, Wi-Fi 7 and Windows 11 Home.", "/images/leader/leader-ai-notebook.png"],
  ["SCP4-C3-I5H", "Leader Companion 4C3 14 inch Notebook i5", 1499, "Leader", "Notebooks", "14 inch Full HD notebook with Intel Core 5 120U, 16GB DDR4, 500GB M.2 NVMe SSD, Intel graphics, Wi-Fi 6E and Windows 11 Home.", "/images/leader/leader-notebook-14.jpg"],
  ["SCP4-C3-I7H", "Leader Companion 4C3 14 inch Notebook i7", 1599, "Leader", "Notebooks", "14 inch Full HD notebook with Intel Core 7 150U, 16GB DDR4, 500GB M.2 NVMe SSD, Intel graphics, Wi-Fi 6E and Windows 11 Home.", "/images/leader/leader-notebook-14.jpg"],
  ["SCP4-C2-A5H", "Leader AI Companion SCP4-C2 14 inch Notebook A5", 1999, "Leader", "Notebooks", "14 inch Full HD notebook with AMD Ryzen AI 5 340, 16GB DDR5, 1TB NVMe SSD, Radeon graphics, Wi-Fi 6E and Windows 11 Home.", "/images/leader/leader-notebook-14.jpg"],
  ["SCP4-C3-I7641TBP", "Leader Companion 4C3 14 inch Notebook i7 64GB", 2149, "Leader", "Notebooks", "14 inch Full HD notebook with Intel Core 7 150U, 64GB DDR4, 1TB NVMe SSD, white backlit keyboard, Wi-Fi 6E and Windows 11 Pro.", "/images/leader/leader-notebook-14.jpg"],
  ["SCP4-C2-A7H", "Leader AI Companion SCP4-C2 14 inch Notebook A7", 2199, "Leader", "Notebooks", "14 inch Full HD notebook with AMD Ryzen AI 7 350, 16GB DDR5, 1TB NVMe SSD, Radeon graphics and Wi-Fi 6E.", "/images/leader/leader-notebook-14.jpg"],
  ["SCP4-C2-A9H", "Leader AI Companion SCP4-C2 14 inch Notebook A9", 2499, "Leader", "Notebooks", "14 inch Full HD notebook with AMD Ryzen AI 9 HX 370, 16GB DDR5, 1TB NVMe SSD, Radeon graphics and Wi-Fi 6E.", "/images/leader/leader-notebook-14.jpg"],
  ["SCU4-C1-U516P", "Leader AI Companion SCU4-C1 14 inch Notebook U5", 2599, "Leader", "Notebooks", "14 inch Full HD+ ultralight notebook with Intel Core Ultra 5 226V, 16GB DDR5, 1TB NVMe SSD, Intel graphics 130V and Windows 11 Pro.", "/images/leader/leader-ai-notebook.png"],
  ["SCU4-C1-U732P", "Leader AI Companion SCU4-C1 14 inch Notebook U7", 2999, "Leader", "Notebooks", "14 inch Full HD+ ultralight notebook with Intel Core Ultra 7 258V, 32GB DDR5, 1TB NVMe SSD, Intel graphics 140V and Windows 11 Pro.", "/images/leader/leader-ai-notebook.png"],
  ["SCP6-C1-A5P", "Leader AI Companion SCP6-C1 16 inch Notebook A5 Pro", 1999, "Leader", "Notebooks", "16 inch Full HD notebook with AMD Ryzen AI 5 340, 16GB DDR5, 1TB M.2 NVMe SSD, Radeon graphics, Wi-Fi 6E and Windows 11 Pro.", "/images/leader/leader-ai-notebook.png"],
  ["SCP4-C2-A5P", "Leader AI Companion SCP4-C2 14 inch Notebook A5 Pro", 1899, "Leader", "Notebooks", "14 inch Full HD notebook with AMD Ryzen AI 5 340, 16GB DDR5, 1TB M.2 NVMe SSD, Radeon graphics, Wi-Fi 6E and Windows 11 Pro.", "/images/leader/leader-ai-notebook.png"],
  ["SCP4-C2-A7P", "Leader AI Companion SCP4-C2 14 inch Notebook A7 Pro", 2099, "Leader", "Notebooks", "14 inch Full HD notebook with AMD Ryzen AI 7 350, 16GB DDR5, 1TB M.2 NVMe SSD, Radeon graphics, Wi-Fi 6E and Windows 11 Pro.", "/images/leader/leader-ai-notebook.png"],

  // Page 4/5 desktop systems
  ["SS46-U5", "Leader Corporate Slim Desktop SS46 U5", 1999, "Leader", "Desktop PCs", "Corporate slim desktop with Intel Core Ultra 5 225, 16GB DDR5, 1TB M.2 NVMe SSD, Windows 11 Pro and 3 year 4 hour onsite warranty.", "/images/leader/leader-desktop.jpg"],
  ["SS46-U7", "Leader Corporate Slim Desktop SS46 U7", 2499, "Leader", "Desktop PCs", "Corporate slim desktop with Intel Core Ultra 7 265, 16GB DDR5, 1TB M.2 NVMe SSD, Windows 11 Pro and 3 year 4 hour onsite warranty.", "/images/leader/leader-desktop.jpg"],
  ["SN17-I7", "Leader Corporate N17 i7 Mini PC", 2099, "Leader", "Mini PCs", "Corporate N17 mini PC with Intel Core i7-13620H, 32GB DDR5, 1TB M.2 NVMe SSD, Iris Xe graphics, Wi-Fi 6E and Windows 11 Pro.", "/images/leader/leader-mini-pc.jpg"],
  ["SV275-I5H", "Leader Visionary AIO 27 inch i5", 1699, "Leader", "All-in-One PCs", "27 inch Full HD all-in-one PC with Intel Core i5-13420H, 16GB DDR4, 1TB M.2 NVMe SSD, pop-up camera and Windows 11 Home.", "/images/leader/leader-aio.jpg"],
  ["SV275-I7H", "Leader Visionary AIO 27 inch i7", 1899, "Leader", "All-in-One PCs", "27 inch Full HD all-in-one PC with Intel Core i7-13620H, 16GB DDR4, 1TB M.2 NVMe SSD, pop-up camera and Windows 11 Home.", "/images/leader/leader-aio.jpg"],
  ["SV563", "Leader Visionary 563 Desktop", 1799, "Leader", "Desktop PCs", "Visionary desktop with Intel Core Ultra 5 225, B860 chipset, 16GB DDR5, 1TB M.2 NVMe SSD, tempered glass tower case and Windows 11 Home.", "/images/leader/leader-desktop.jpg"],
  ["SV776", "Leader Visionary 776 Desktop", 2599, "Leader", "Desktop PCs", "Visionary desktop with Intel Core Ultra 7 265, B860 chipset, 32GB DDR5, 1TB M.2 NVMe SSD, tempered glass tower case and Windows 11 Home.", "/images/leader/leader-desktop.jpg"],

  // Page 7 APC
  ["UPA-BGM2200B", "APC Back-UPS Pro Gaming 2200VA Midnight", 779, "APC", "UPS", "APC Back-UPS Pro Gaming 2200VA/1320W tower UPS in midnight black with RGB lighting, pure sine wave and six Australian outlets.", "/product-placeholder.svg"],
  ["UPA-BGM2200", "APC Back-UPS Pro Gaming 2200VA Arctic", 779, "APC", "UPS", "APC Back-UPS Pro Gaming 2200VA/1320W tower UPS in arctic white with RGB lighting, pure sine wave and six Australian outlets.", "/product-placeholder.svg"],
  ["UPAPCBX750MI", "APC Back-UPS 750VA Line Interactive UPS", 189, "APC", "UPS", "Line interactive tower UPS with 750VA/410W capacity, 230V/10A input, three Australian outlets and lead acid battery.", "/product-placeholder.svg"],
  ["UPAPCBX950MI-AZ", "APC Back-UPS 950VA Line Interactive UPS", 239, "APC", "UPS", "Line interactive tower UPS with 950VA/520W capacity, 230V/10A input, four Australian outlets and lead acid battery.", "/product-placeholder.svg"],
  ["UPAPCBX1200MI-AZ", "APC Back-UPS 1200VA Line Interactive UPS", 279, "APC", "UPS", "Line interactive tower UPS with 1200VA/650W capacity, 230V/10A input, four Australian outlets and lead acid battery.", "/product-placeholder.svg"],
  ["UPAPC-PPS330-AZ", "APC Back-UPS 1600VA Line Interactive UPS", 359, "APC", "UPS", "Line interactive tower UPS with 1600VA/900W capacity, 230V/10A input, four Australian outlets and lead acid battery.", "/product-placeholder.svg"],
  ["UPAPCBE550-AZ", "APC Back-UPS 550VA Power-Saving UPS", 229, "APC", "UPS", "Desk top power-saving UPS with 550VA/330W capacity, 230V/10A input, eight Australian outlets and user replaceable lead acid battery.", "/product-placeholder.svg"],
  ["UPAPCBE700-AZ", "APC Back-UPS 700VA Power-Saving UPS", 299, "APC", "UPS", "Desk top power-saving UPS with 700VA/405W capacity, 230V/10A input, eight Australian outlets and user replaceable lead acid battery.", "/product-placeholder.svg"],

  // Page 8 Brother and PowerShield
  ["PRB-MFC-L9630CDN", "Brother MFC-L9630CDN Colour Laser MFP", 2699, "Brother", "Printers", "Colour laser multi-function printer with print, copy, scan, fax and optional wireless support.", "/product-placeholder.svg"],
  ["PRB-HLL2445DW", "Brother HL-L2445DW Compact Mono Laser Printer", 295, "Brother", "Printers", "Compact mono laser printer with up to 32ppm print speeds, 2-sided printing and wired/wireless networking.", "/product-placeholder.svg"],
  ["PRB-QL-820NWB", "Brother QL-820NWB Wireless Label Printer", 395, "Brother", "Printers", "Wireless and networkable high speed label printer supporting Wi-Fi and Bluetooth.", "/product-placeholder.svg"],
  ["PRB-MFCL2880DW", "Brother MFC-L2880DW Compact Mono Laser MFP", 545, "Brother", "Printers", "Compact mono laser multi-function centre with print, scan, copy and fax, up to 34ppm and 2-sided printing.", "/product-placeholder.svg"],
  ["SCB-ADS-3100", "Brother ADS-3100 Advanced Document Scanner", 549, "Brother", "Scanners", "High-speed desktop document scanner for small office and home office professionals.", "/product-placeholder.svg"],
  ["PRB-MFCL3755CDW", "Brother MFC-L3755CDW Compact Colour Laser MFP", 789, "Brother", "Printers", "Compact colour laser multi-function centre with print, scan, copy and fax, up to 26ppm and 2-sided printing.", "/product-placeholder.svg"],
  ["PRB-HL-L5210DN", "Brother HL-L5210DN Professional Mono Laser Printer", 859, "Brother", "Printers", "Professional mono laser printer with up to 48ppm, 2-sided printing, 250 sheet paper tray and wired networking.", "/product-placeholder.svg"],
  ["UPPS-CRT2000VA", "PowerShield Commander RT 2000VA UPS", 1909, "PowerShield", "UPS", "Commander RT 2000VA/1800W rack/tower UPS with pure sine wave, programmable power management and two year warranty.", "/product-placeholder.svg"],
  ["UPPS-CRT3000VA", "PowerShield Commander RT 3000VA UPS", 2599, "PowerShield", "UPS", "Commander RT 3000VA/2700W rack/tower UPS with hot-swappable batteries, 15A input and two year warranty.", "/product-placeholder.svg"],
  ["UPPS-PSCERT1000", "PowerShield Centurion RT 1000VA UPS", 1539, "PowerShield", "UPS", "Centurion RT 1000VA/900W true online double conversion rack/tower UPS with two year warranty.", "/product-placeholder.svg"],
  ["UPPS-PSCERT2000SB", "PowerShield Centurion RT 2000VA Short Base UPS", 2195, "PowerShield", "UPS", "Centurion RT 2000VA/1800W short base true online double conversion UPS for comms cabinet compatibility.", "/product-placeholder.svg"],
  ["UPPS-PSCERT2000", "PowerShield Centurion RT 2000VA UPS", 2565, "PowerShield", "UPS", "Centurion RT 2000VA/1800W true online double conversion rack/tower UPS with two year warranty.", "/product-placeholder.svg"],

  // Page 9 Ubiquiti switches
  ["NHU-ECS-24-POE", "Ubiquiti Enterprise Campus 24 PoE Switch", 6039, "Ubiquiti", "Network Switches", "24-port Layer 3 Etherlighting PoE+++ switch with high-capacity 10GbE ports and 1050W total PoE availability via Shared Mode.", "/product-placeholder.svg"],
  ["NHU-ECS-48-POE", "Ubiquiti Enterprise Campus 48 PoE Switch", 8139, "Ubiquiti", "Network Switches", "48-port Layer 3 Etherlighting PoE+++ switch with high-capacity 10GbE ports and 2150W total PoE availability via Shared Mode.", "/product-placeholder.svg"],
  ["NHU-USW-PRO-HD-24", "Ubiquiti Pro HD 24 Switch", 1279, "Ubiquiti", "Network Switches", "Professional-grade Layer 3 Etherlighting switch with 2x10GbE, 22x2.5GbE and 4x10G SFP+ ports.", "/product-placeholder.svg"],
  ["NHU-USW-PRO-XG-10-POE", "Ubiquiti Pro XG 10 PoE Switch", 1489, "Ubiquiti", "Network Switches", "1U professional-grade 10-port Layer 3 Etherlighting PoE+++ switch with 10x10GbE and 2x10G SFP+ ports.", "/product-placeholder.svg"],
  ["NHU-USW-PRO-HD-24-POE", "Ubiquiti Pro HD 24 PoE Switch", 2049, "Ubiquiti", "Network Switches", "Professional-grade Layer 3 Etherlighting switch with 2x10GbE PoE++, 22x2.5GbE PoE++ and 4x10G SFP+ ports.", "/product-placeholder.svg"],
  ["NHU-USW-PRO-XG-48-POE", "Ubiquiti Pro XG 48 PoE Switch", 5209, "Ubiquiti", "Network Switches", "Professional-grade 48-port Layer 3 Etherlighting PoE+++ switch with 32x10GbE, 16x2.5GbE PoE and 4x25G SFP28 ports.", "/product-placeholder.svg"],

  // Page 10 Microsoft subscription catalogue entries
  ["M365-BASIC-COPILOT-TEAMS", "Microsoft 365 Business Basic + Copilot with Teams", 45, "Microsoft", "Software", "Annual commitment billed monthly subscription combining lightweight web and mobile apps with Microsoft 365 Copilot.", "/product-placeholder.svg"],
  ["M365-STANDARD-COPILOT-TEAMS", "Microsoft 365 Business Standard + Copilot with Teams", 55, "Microsoft", "Software", "Annual commitment billed monthly subscription combining web, mobile and desktop apps with Microsoft 365 Copilot.", "/product-placeholder.svg"],
  ["M365-PREMIUM-COPILOT-TEAMS", "Microsoft 365 Business Premium + Copilot with Teams", 69, "Microsoft", "Software", "Annual commitment billed monthly subscription for productivity, security and Microsoft 365 Copilot.", "/product-placeholder.svg"],
  ["M365-DEFENDER-SUITE", "Microsoft Defender Suite", 19, "Microsoft", "Software", "Microsoft Defender suite for endpoint, Office 365, identity and cloud apps security. Requires E3 or E5.", "/product-placeholder.svg"],
  ["M365-BUSINESS-PREMIUM-TEAMS", "Microsoft 365 Business Premium with Teams Annual", 395, "Microsoft", "Software", "Annual Microsoft 365 Business Premium with Teams plan for SMB productivity, collaboration, Intune and Defender for Business.", "/product-placeholder.svg"],
  ["M365-E3-TEAMS", "Microsoft 365 E3 with Teams Annual", 685, "Microsoft", "Software", "Annual Microsoft 365 E3 with Teams plan for enhanced management, compliance and productivity.", "/product-placeholder.svg"],
  ["M365-E5-TEAMS", "Microsoft 365 E5 with Teams Annual", 1025, "Microsoft", "Software", "Annual Microsoft 365 E5 with Teams plan for enterprise-grade productivity, security, compliance and analytics.", "/product-placeholder.svg"],

  // Page 11 gaming
  ["SRS-R55-15V1", "Resistance Striker R55-15 V1 Gaming Notebook 16GB", 2799, "Leader", "Gaming Notebooks", "Gaming notebook with Intel Core i7-14650HX, NVIDIA GeForce RTX 5050 8GB GDDR7, 16GB DDR5, 1TB M.2 NVMe SSD, Wi-Fi 7, multicolour backlit keyboard and Windows 11 Home.", "/images/leader/leader-ai-notebook.png"],
  ["SRS-R55-1532V1", "Resistance Striker R55-15 V1 Gaming Notebook 32GB", 3299, "Leader", "Gaming Notebooks", "Gaming notebook with Intel Core i7-14650HX, NVIDIA GeForce RTX 5050 8GB GDDR7, 32GB DDR5, 2TB M.2 NVMe SSD, Wi-Fi 7, multicolour backlit keyboard and Windows 11 Home.", "/images/leader/leader-ai-notebook.png"],
  ["SRAV44-E", "Resistance Apache V44 Essential Gaming PC", 2499, "Leader", "Gaming Desktops", "Gaming desktop with Intel Core i5-12400, NVIDIA RTX 5050 Dual 8GB, B760 chipset, 16GB DDR5, 1TB M.2 NVMe SSD and Windows 11 Home.", "/images/leader/leader-gaming-desktop.jpg"],
  ["SRAV44-P", "Resistance Apache V44 Plus Gaming PC", 3999, "Leader", "Gaming Desktops", "Gaming desktop with Intel Core Ultra 5 225, NVIDIA RTX 5070, Z890 chipset, 32GB DDR5, 2TB M.2 NVMe SSD and Windows 11 Home.", "/images/leader/leader-gaming-desktop.jpg"],
  ["SRAV44-U", "Resistance Apache V44 Ultimate Gaming PC", 6999, "Leader", "Gaming Desktops", "Gaming desktop with AMD Ryzen 7 9800X3D, NVIDIA RTX 5080, B850 chipset, 64GB DDR5, 4TB M.2 NVMe SSD and Windows 11 Home.", "/images/leader/leader-gaming-desktop.jpg"],

  // Page 12 Verbatim
  ["MNV-49590", "Verbatim 14 inch Full HD Portable Monitor", 279, "Verbatim", "Monitors", "14 inch Full HD 1080p portable monitor with HDR support and USB-C one cable setup.", "/product-placeholder.svg"],
  ["HXV-2TBG4BLACK", "Verbatim Store'n'Go Grid Design Hard Drive 2TB", 169, "Verbatim", "Storage", "USB 3.0 Gen 1 portable hard drive with 2TB storage and Nero Backup Software.", "/product-placeholder.svg"],
  ["NAV-32147", "Verbatim Share My Screen 4K Adapter", 199, "Verbatim", "Adapters", "Share My Screen 4K adapter supporting 4K at 30Hz for presentations, streaming and gaming with USB-C devices.", "/product-placeholder.svg"],
  ["CBV-31854", "Verbatim USB-C to USB-C 100W Magnetic Cable", 19, "Verbatim", "Cables", "120cm USB-C to USB-C magnetic cable with 100W PD fast charging.", "/product-placeholder.svg"],
  ["SPV-41645", "Verbatim Multimedia Headphones with Volume Control", 19, "Verbatim", "Headphones", "Multimedia headphones with volume control and high-quality stereo sound.", "/product-placeholder.svg"],
  ["MIV-70242", "Verbatim Silent Ergonomic Wireless Blue LED Mouse", 29, "Verbatim", "Mice", "Silent ergonomic wireless mouse with Blue LED sensor and silent click switches.", "/product-placeholder.svg"],
  ["SPV-67031", "Verbatim Classic USB-C Headset", 29, "Verbatim", "Headsets", "Classic on-ear USB-C headset with padded ear cups and adjustable headband.", "/product-placeholder.svg"],
  ["CBV-66974", "Verbatim USB-C and Lightning 2-in-1 60W Cable", 29, "Verbatim", "Cables", "2-in-1 USB-C and Lightning cable with 60W support and MFi certification.", "/product-placeholder.svg"],
  ["32366", "Verbatim Agenda Wireless Presenter", 59, "Verbatim", "Presentation Tools", "Wireless presenter with clear laser projection up to 100 metres and built-in rechargeable USB-C battery.", "/product-placeholder.svg"],
  ["VIV-66614", "Verbatim 1080p Full HD Webcam", 69, "Verbatim", "Webcams", "1080p Full HD webcam with directional high-sensitivity microphone and stereo audio.", "/product-placeholder.svg"],
  ["MPV-66972", "Verbatim Charge'n'Go Power Bank 10000mAh", 69, "Verbatim", "Power Banks", "10000mAh power bank with built-in USB-C and Lightning cables plus USB-C and USB-A ports.", "/product-placeholder.svg"],
  ["MPV-67038", "Verbatim 3-in-1 Wireless Docking Charger", 89, "Verbatim", "Chargers", "Qi2 certified 3-in-1 wireless charging dock with 15W fast charging support.", "/product-placeholder.svg"],

  // Page 13 Corsair, Durabook, LG
  ["CAC-AIR5400RS-R-ARGB-BK", "Corsair AIR 5400 RS-R ARGB Mid-Tower ATX Case", 389, "Corsair", "Computer Cases", "Black triple-chamber mid-tower ATX case with glass panels, USB-C, ATX/E-ATX support and RS ARGB fans.", "/product-placeholder.svg"],
  ["CAC-3500XRS-R-ARGB-BK", "Corsair 3500X RS-R ARGB Mid-Tower PC Case", 189, "Corsair", "Computer Cases", "Black E-ATX mid-tower PC case with side tempered glass, USB-C, SSD/HDD support and ARGB fans.", "/product-placeholder.svg"],
  ["CFCW-NAUT360RSLCD-BK", "Corsair Nautilus 360 RS LCD Liquid CPU Cooler", 229, "Corsair", "Cooling", "Black 360mm liquid CPU cooler with LCD pump, three PWM fans, AM5/LGA1851 support and copper plate.", "/product-placeholder.svg"],
  ["PSCP-RM1000X-ATX3", "Corsair RMx Series RM1000x Fully Modular PSU", 309, "Corsair", "Power Supplies", "1000W fully modular ATX 3.1 power supply with 80 PLUS Gold, Zero RPM mode and multiple PCIe/SATA/EPS connectors.", "/product-placeholder.svg"],
  ["PSCP-SF850", "Corsair SF Series SF850 Fully Modular Platinum PSU", 319, "Corsair", "Power Supplies", "850W fully modular SFX power supply with 80 PLUS Platinum, 92mm FDB fan and ATX 3.1 support.", "/product-placeholder.svg"],
  ["NBDB-R0M1A25AHAXX", "Durabook R10 Rugged Tablet", 5499, "Durabook", "Rugged Tablets", "10.1 inch WUXGA rugged tablet with Intel Core Ultra 5 226V, 16GB RAM, 256GB SSD, Wi-Fi 7, AI Boost NPU and Windows 11 Pro.", "/product-placeholder.svg"],
  ["NBDB-Z4K1Q3DAHBXX", "Durabook Z14I Rugged Laptop", 5999, "Durabook", "Rugged Laptops", "14 inch Full HD rugged laptop with Intel Core Ultra 5 125U, 16GB RAM, 512GB SSD, multi-carrier 4G LTE, Wi-Fi 7 and Windows 11 Pro.", "/product-placeholder.svg"],
  ["NBDB-R8H5012AHAXX", "Durabook R8 Rugged Tablet", 2599, "Durabook", "Rugged Tablets", "8 inch Full HD rugged tablet with Intel Pentium Gold 8500, 8GB RAM, 128GB SSD, Wi-Fi 6E, USB-C and Windows 11 Pro.", "/product-placeholder.svg"],
  ["NBDB-S4K1Q3AAHBCX", "Durabook S14I Rugged Laptop", 3939, "Durabook", "Rugged Laptops", "14 inch Full HD rugged laptop with Intel Core Ultra 5 125U, 16GB RAM, 512GB SSD, Wi-Fi 7, backlit keyboard and Windows 11 Pro.", "/product-placeholder.svg"],
  ["NBDB-S5G1Q3AAHBXE", "Durabook S15 Rugged Laptop", 3999, "Durabook", "Rugged Laptops", "15 inch Full HD rugged laptop with Intel Core i5-1235U, 16GB RAM, 512GB SSD, Wi-Fi 6E, backlit keyboard and Windows 11 Pro.", "/product-placeholder.svg"],
  ["NBDB-R1G1Q2DEHAXX", "Durabook R11 Rugged Tablet", 4499, "Durabook", "Rugged Tablets", "11.6 inch Full HD rugged tablet with Intel Core i5-1235U, 16GB RAM, 256GB SSD, 4G LTE, Wi-Fi 6E and Windows 11 Pro.", "/product-placeholder.svg"],
  ["MNL-32U990A-S", "LG UltraFine evo 32 inch 6K IPS Black Monitor", 3699, "LG", "Monitors", "32 inch 6K UltraFine evo monitor with IPS Black, Thunderbolt 5, HDMI 2.1 and ergonomic adjustments.", "/product-placeholder.svg"],
  ["MNL-27U731SA-W", "LG 27 inch 4K UHD IPS Smart Monitor", 599, "LG", "Monitors", "27 inch 4K UHD IPS smart monitor with 3840x2160 resolution, 60Hz refresh, HDR400 and USB-C support.", "/product-placeholder.svg"],
  ["MNL-40U990A-W", "LG UltraFine 40 inch 5K2K Nano IPS Black Monitor", 2699, "LG", "Monitors", "40 inch 5K2K Nano IPS Black monitor with HDR True Black 600, Thunderbolt 5, DCI-P3 99% and height/tilt/pivot stand.", "/product-placeholder.svg"],
  ["MNL-49U950A-W", "LG 49 inch UltraWide DQHD Curved Monitor", 2699, "LG", "Monitors", "49 inch UltraWide DQHD curved Nano IPS monitor with 5120x1440 resolution, 144Hz, 1ms MBR, HDR400 and dual 10W speakers.", "/product-placeholder.svg"],

  // Page 14 Brateck
  ["MABT-LDT10-C024", "Brateck Dual Monitor Aluminum Counterbalance Arm", 299, "Brateck", "Monitor Arms", "Dual monitor aluminum interactive counterbalance monitor arm for most 13-32 inch monitors up to 9kg per screen.", "/product-placeholder.svg"],
  ["MABT-LDT23-C022", "Brateck Dual Monitor Heavy-Duty Gas Spring Arm", 399, "Brateck", "Monitor Arms", "Dual monitors aluminum heavy-duty gas spring monitor arm with handle for most 17-32 inch monitors up to 8kg per screen.", "/product-placeholder.svg"],
  ["MABT-LDT33-C024", "Brateck Dual Monitor Steel Articulating Arm", 169, "Brateck", "Monitor Arms", "Affordable steel articulating dual monitor arm for most 17-31 inch monitors up to 9kg per screen.", "/product-placeholder.svg"],
  ["MABT-LDT82-C012UC-BK", "Brateck Single Screen Heavy-Duty Gas Spring Arm", 169, "Brateck", "Monitor Arms", "Single screen heavy-duty gas spring monitor arm with USB ports for most 17-45 inch monitors.", "/product-placeholder.svg"],
  ["MABT-LDT13-C024E", "Brateck Economy Dual-Screen Spring-Assisted Arm", 169, "Brateck", "Monitor Arms", "Economy dual-screen spring-assisted monitor arm for most 17-32 inch monitors up to 9kg.", "/product-placeholder.svg"],
  ["MABT-LDT48-C024", "Brateck Dual Monitor Pole-Mounted Gas Spring Arm", 189, "Brateck", "Monitor Arms", "Dual monitor pole-mounted gas spring monitor arm for most 17-32 inch monitors up to 9kg per screen.", "/product-placeholder.svg"],
  ["MABT-LDT49-C012-B", "Brateck Premium Slim Aluminum Monitor Arm", 199, "Brateck", "Monitor Arms", "Single monitor premium slim aluminum spring-assisted monitor arm for most 17-32 inch monitors up to 9kg.", "/product-placeholder.svg"],
  ["MABT-LDT63-C024-B", "Brateck Dual Monitor Economical Spring-Assisted Arm", 199, "Brateck", "Monitor Arms", "Dual monitor economical spring-assisted arm for most 17-32 inch monitors up to 9kg per screen.", "/product-placeholder.svg"],
  ["MABT-LDT81-C022UC-B", "Brateck Dual Monitor Gas Spring Arm with USB Ports", 209, "Brateck", "Monitor Arms", "Dual monitor gas spring monitor arm with USB-A and USB-C ports for most 17-32 inch monitors.", "/product-placeholder.svg"],
  ["MABT-LDT72-T024", "Brateck Premium Aluminum Articulating Monitor Stand", 219, "Brateck", "Monitor Arms", "Premium aluminum articulating monitor stand for most 17-32 inch monitors with up to 8kg capacity.", "/product-placeholder.svg"],
  ["MABT-LDT16-C024", "Brateck Dual Monitor Full Extension Gas Spring Arm", 229, "Brateck", "Monitor Arms", "Dual monitor full extension gas spring arm with independent arms for most 17-32 inch monitors up to 8kg per screen.", "/product-placeholder.svg"],

  // Page 15 chairs
  ["LDR-ERGOLITE-ULTRA-BLACK", "LDR ErgoLite Ultra Chair Black", 699, "LDR Office Solutions", "Office Chairs", "Premium ergonomic office chair with 3D arms, seat slider, lumbar support, five-lock backrest and synchro tilt.", "/product-placeholder.svg"],
  ["LDR-ERGOLITE-ULTRA-BLUE", "LDR ErgoLite Ultra Chair Blue", 699, "LDR Office Solutions", "Office Chairs", "Premium ergonomic office chair with 3D arms, seat slider, lumbar support, five-lock backrest and synchro tilt.", "/product-placeholder.svg"],
  ["LDR-ERGOLITE-ULTRA-GREY", "LDR ErgoLite Ultra Chair Grey", 699, "LDR Office Solutions", "Office Chairs", "Premium ergonomic office chair with 3D arms, seat slider, lumbar support, five-lock backrest and synchro tilt.", "/product-placeholder.svg"],
  ["LDR-VISIT-BLACK", "LDR VISIT High Chair Black", 329, "LDR Office Solutions", "Office Chairs", "High chair for visitor and hot desks with steel legs, moulded ABS seat, backrest and armrests with fabric covering.", "/product-placeholder.svg"],
  ["LDR-VISIT-BLUE", "LDR VISIT High Chair Blue", 329, "LDR Office Solutions", "Office Chairs", "High chair for visitor and hot desks with steel legs, moulded ABS seat, backrest and armrests with fabric covering.", "/product-placeholder.svg"],
  ["LDR-VISIT-GREY", "LDR VISIT High Chair Grey", 329, "LDR Office Solutions", "Office Chairs", "High chair for visitor and hot desks with steel legs, moulded ABS seat, backrest and armrests with fabric covering.", "/product-placeholder.svg"],
  ["LDR-ERGOLITE-MAX-BLACK", "LDR ErgoLite Max Office Chair Black", 439, "LDR Office Solutions", "Office Chairs", "Ergonomic office chair with lumbar support, mesh back, moulded foam seat, synchro tilt and fixed arms.", "/product-placeholder.svg"],
  ["LDR-ERGOLITE-MAX-BLUE", "LDR ErgoLite Max Office Chair Blue", 439, "LDR Office Solutions", "Office Chairs", "Ergonomic office chair with lumbar support, mesh back, moulded foam seat, synchro tilt and fixed arms.", "/product-placeholder.svg"],
  ["LDR-ERGOLITE-MAX-GREY", "LDR ErgoLite Max Office Chair Grey", 439, "LDR Office Solutions", "Office Chairs", "Ergonomic office chair with lumbar support, mesh back, moulded foam seat, synchro tilt and fixed arms.", "/product-placeholder.svg"],
  ["LDR-FLEXLEARN-360-BLACK", "LDR Flex Learn 360 Chair Black", 749, "LDR Office Solutions", "Office Chairs", "Training chair with writing table, moulded foam, fabric seat/back, alloy base and smooth castors.", "/product-placeholder.svg"],
  ["LDR-FLEXLEARN-360-BLUE", "LDR Flex Learn 360 Chair Blue", 749, "LDR Office Solutions", "Office Chairs", "Training chair with writing table, moulded foam, fabric seat/back, alloy base and smooth castors.", "/product-placeholder.svg"],
  ["LDR-FLEXLEARN-360-GREY", "LDR Flex Learn 360 Chair Grey", 749, "LDR Office Solutions", "Office Chairs", "Training chair with writing table, moulded foam, fabric seat/back, alloy base and smooth castors.", "/product-placeholder.svg"],
  ["LDR-FOCUS-ULTRA-BLACK", "LDR Focus Ultra Chair Black", 899, "LDR Office Solutions", "Office Chairs", "High-back lounge chair with ergonomic design, fabric upholstery, wide headrest and curved armrests.", "/product-placeholder.svg"],
  ["LDR-FOCUS-ULTRA-BLUE", "LDR Focus Ultra Chair Blue", 899, "LDR Office Solutions", "Office Chairs", "High-back lounge chair with ergonomic design, fabric upholstery, wide headrest and curved armrests.", "/product-placeholder.svg"],
  ["LDR-FOCUS-ULTRA-GREY", "LDR Focus Ultra Chair Grey", 899, "LDR Office Solutions", "Office Chairs", "High-back lounge chair with ergonomic design, fabric upholstery, wide headrest and curved armrests.", "/product-placeholder.svg"],
  ["LDR-FLEXLEARN-ULTRA-BLACK", "LDR Flex Learn Ultra Training Chair Black", 999, "LDR Office Solutions", "Office Chairs", "Soft touch lounge training chair with ergonomic design, storage shelf, laptop tray platform and cup holder.", "/product-placeholder.svg"],
  ["LDR-FLEXLEARN-ULTRA-BLUE", "LDR Flex Learn Ultra Training Chair Blue", 999, "LDR Office Solutions", "Office Chairs", "Soft touch lounge training chair with ergonomic design, storage shelf, laptop tray platform and cup holder.", "/product-placeholder.svg"],
  ["LDR-FLEXLEARN-ULTRA-GREY", "LDR Flex Learn Ultra Training Chair Grey", 999, "LDR Office Solutions", "Office Chairs", "Soft touch lounge training chair with ergonomic design, storage shelf, laptop tray platform and cup holder.", "/product-placeholder.svg"],
  ["LDR-FOCUS-360-BLACK", "LDR Focus 360 Chair Black", 1299, "LDR Office Solutions", "Office Chairs", "High back executive chair with moulded foam, PU or fabric finish, fixed mechanism and four-star alloy base.", "/product-placeholder.svg"],
  ["LDR-FOCUS-360-BLUE", "LDR Focus 360 Chair Blue", 1299, "LDR Office Solutions", "Office Chairs", "High back executive chair with moulded foam, PU or fabric finish, fixed mechanism and four-star alloy base.", "/product-placeholder.svg"],
  ["LDR-FOCUS-360-GREY", "LDR Focus 360 Chair Grey", 1299, "LDR Office Solutions", "Office Chairs", "High back executive chair with moulded foam, PU or fabric finish, fixed mechanism and four-star alloy base.", "/product-placeholder.svg"],

  // Page 16 Yealink and ViewSonic
  ["IPY-T85W", "Yealink SIP-T85W IP Phone", 359, "Yealink", "IP Phones", "SIP-T85W IP phone with 5.5 inch colour display, 16 SIP accounts, HD voice, Bluetooth 5.0, Wi-Fi 6, dual USB, PoE and Linux 6.1.", "/product-placeholder.svg"],
  ["IPY-T87W", "Yealink SIP-T87W IP Phone", 499, "Yealink", "IP Phones", "SIP-T87W IP phone with 7 inch touchscreen, 16 SIP accounts, HD voice, Bluetooth 5.0, Wi-Fi 6, dual USB, PoE and Linux 6.1.", "/product-placeholder.svg"],
  ["IPY-T88W", "Yealink SIP-T88W IP Phone", 589, "Yealink", "IP Phones", "SIP-T88W IP phone with 7 inch touchscreen, Android 13, HD voice, Bluetooth 5.0, Wi-Fi 6, dual USB, PoE and optional BTH88 handset.", "/product-placeholder.svg"],
  ["IPY-T73U", "Yealink SIP-T73U IP Phone", 249, "Yealink", "IP Phones", "SIP-T73U IP phone with 2.8 inch colour display, 12 SIP accounts, HD voice, USB and PoE, plus Bluetooth and Wi-Fi via adapter.", "/product-placeholder.svg"],
  ["IPY-T77U", "Yealink SIP-T77U IP Phone", 479, "Yealink", "IP Phones", "SIP-T77U IP phone with 7 inch touchscreen, 16 SIP accounts, dual USB, HD voice, PoE, Linux 6.1 and TEE encryption.", "/product-placeholder.svg"],
  ["IPV-CN6501-1C", "ViewSonic 65 inch 4K Presentation Display", 2089, "ViewSonic", "Displays", "65 inch 4K presentation display with 24/7 playback, USB-C port, intuitive signage player and commercial brightness.", "/product-placeholder.svg"],
  ["IPV-CN7501-1C", "ViewSonic 75 inch 4K Presentation Display", 3189, "ViewSonic", "Displays", "75 inch 4K presentation display with 24/7 playback, USB-C port, intuitive signage player and commercial brightness.", "/product-placeholder.svg"],

  // Page 17 mobility and audio
  ["MD-ZAFM0192AU", "Lenovo Idea Tab 11 5G", 549, "Lenovo", "Tablets", "Idea Tab 11 5G with 128GB storage, paper-like tablet finish in Luna Grey, Android, 7040mAh battery and one year warranty.", "/product-placeholder.svg"],
  ["MD-ZAEG0045AU", "Lenovo Yoga Tab Plus", 1399, "Lenovo", "Tablets", "Yoga Tab Plus with 12.7 inch 3K LTPS display, Snapdragon 8 Gen 3 mobile platform and 10200mAh battery.", "/product-placeholder.svg"],
  ["MF-SM-A176BZKCATS", "Samsung Galaxy A17 5G 128GB Black", 349, "Samsung", "Mobile Phones", "Samsung Galaxy A17 5G in black with 128GB storage, 6.7 inch Super AMOLED display, 50MP/13MP camera and 5000mAh battery.", "/product-placeholder.svg"],
  ["MF-GA09744-CA", "Google Pixel 10 5G 128GB Obsidian", 1349, "Google", "Mobile Phones", "Google Pixel 10 5G in Obsidian with 128GB storage, 6.3 inch Gorilla Glass Victus display, 48MP/10.5MP camera and 4970mAh battery.", "/product-placeholder.svg"],
  ["MPA-WCA012AUBK", "Belkin BoostCharge 25W USB-C PD Wall Charger", 29, "Belkin", "Chargers", "BoostCharge 25W USB-C PD 3.1 cubic wall charger in black with MFi certification and connected equipment warranty.", "/product-placeholder.svg"],
  ["MPA-CHDP109", "OtterBox Rugged Apple iPad Case Black", 59, "OtterBox", "Tablet Cases", "Rugged black Apple iPad 11th Gen and iPad 10th Gen case with built-in kickstand and adjustable hand strap.", "/product-placeholder.svg"],
  ["MPA-77-97534", "OtterBox Defender MagSafe Apple iPhone Case Black", 99, "OtterBox", "Phone Cases", "Defender MagSafe black case for iPhone 16e, iPhone 15, iPhone 14 and iPhone 13 with DROP+ 7X military standard protection.", "/product-placeholder.svg"],
  ["MPA-324012114343", "OtterBox Plasma Microsoft Surface Pro Rugged Case", 159, "OtterBox", "Tablet Cases", "Plasma Microsoft Surface Pro 11/Pro 10/Pro 9 hand and shoulder strap rugged case in ice.", "/product-placeholder.svg"],
  ["SPE-T5S-BLACK", "Edifier T5s Powered Subwoofer Black", 289, "Edifier", "Speakers", "Black powered active subwoofer with 38Hz frequency response MDF enclosure and adjustable bass/frequency bandwidth.", "/product-placeholder.svg"],
  ["SPE-T5S-BROWN", "Edifier T5s Powered Subwoofer Brown", 289, "Edifier", "Speakers", "Brown powered active subwoofer with 38Hz frequency response MDF enclosure and adjustable bass/frequency bandwidth.", "/product-placeholder.svg"],
  ["SPE-W830NB-BLK", "Edifier W830NB Wireless Over-ear Headphones Black", 129, "Edifier", "Headphones", "Wireless over-ear headphones with active noise cancellation up to -45dB and multiple modes.", "/product-placeholder.svg"],
  ["SPE-W830NB-GRAY", "Edifier W830NB Wireless Over-ear Headphones Grey", 129, "Edifier", "Headphones", "Wireless over-ear headphones with active noise cancellation up to -45dB and multiple modes.", "/product-placeholder.svg"],
  ["SPE-MR5-BLACK", "Edifier MR5 Tri-amped Powered Studio Monitor Speakers Black", 359, "Edifier", "Speakers", "Black tri-amped powered studio monitor speakers with flat frequency response from 46Hz to 40kHz and 110W RMS output.", "/product-placeholder.svg"],
  ["SPE-MR5-WHITE", "Edifier MR5 Tri-amped Powered Studio Monitor Speakers White", 359, "Edifier", "Speakers", "White tri-amped powered studio monitor speakers with flat frequency response from 46Hz to 40kHz and 110W RMS output.", "/product-placeholder.svg"],

  // Page 18 industrial systems
  ["SYS-BPCAL03", "Leader BPCAL03 Embedded Box PC i5UE", 599, "Leader", "Industrial PCs", "Embedded box PC with Intel Core i5-1245UE, DDR4, six USB, LAN, vPro support, fanless design and 24/7 certification.", "/images/leader/leader-mini-pc.jpg"],
  ["SYS-NE10N", "Leader NE10N Nano Mini PC Barebone", 699, "Leader", "Industrial PCs", "0.5L barebone nano mini PC with Intel N100, aluminum chassis, HDMI, DisplayPort and three year warranty.", "/images/leader/leader-mini-pc.jpg"],
  ["SYS-DH610", "Leader DH610 Slim Mini PC Barebone", 979, "Leader", "Industrial PCs", "1L barebone slim mini PC supporting Intel 14th/13th/12th Gen processors with LAN, HDMI, DisplayPort and USB connectivity.", "/images/leader/leader-mini-pc.jpg"],
  ["SYS-SPCEL03", "Leader SPCEL03 Edge IoT PC", 1469, "Leader", "Industrial PCs", "Edge IoT PC with Intel Atom x6413E, DDR4, fanless design, COM, USB, HDMI and wide temperature support.", "/images/leader/leader-mini-pc.jpg"],
  ["SYS-NA10H", "Leader NA10H Nano Mini PC Barebone", 1609, "Leader", "Industrial PCs", "0.5L nano mini PC barebone supporting AMD Ryzen 7/9 with DDR5, LAN, HDMI, DisplayPort and 24/7 certification.", "/images/leader/leader-mini-pc.jpg"],
  ["SYS-NT10H", "Leader NT10H Nano Mini PC Barebone", 1869, "Leader", "Industrial PCs", "0.5L nano mini PC barebone supporting Intel Core Ultra 5/7/9 with DDR5, LAN, HDMI, DisplayPort and 24/7 certification.", "/images/leader/leader-mini-pc.jpg"],
  ["SYS-DN11H", "Leader DN11H Slim Mini AI PC Barebone", 1949, "Leader", "Industrial PCs", "1L barebone slim mini AI PC supporting Intel Meteor Lake Core Ultra 5/7/9 with DDR5, RAID NVMe storage, HDMI and DisplayPort.", "/images/leader/leader-mini-pc.jpg"],
];

const toRecord = ([code, description, advertisedInc, manufacturer, category, details, imageUrl]) => {
  const dealerBase = Number((advertisedInc / 1.21).toFixed(2));
  return {
    code,
    supplierCode: code,
    manufacturer,
    description,
    longDescription: `${details} PDF advertised price: $${advertisedInc.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} inc GST. Product code: ${code}.`,
    leaderCategory: category,
    leaderSheet: "Q1 Catalogue 2026 PDF",
    leaderStatus: "PDF catalogue",
    leaderDealerBuyEx: dealerBase,
    leaderRrpInc: advertisedInc,
    leaderSpecs: {
      "PDF advertised price inc GST": `$${advertisedInc.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      Source: "Leader Q1 Catalogue 2026 PDF",
      Category: category,
    },
    imageUrl,
    imageUrls: [imageUrl],
  };
};

let added = 0;
for (const product of products) {
  const record = toRecord(product);
  if (existingCodes.has(record.code)) continue;
  existingProducts.push(record);
  existingCodes.add(record.code);
  added += 1;
}

existingProducts.sort((a, b) => String(a.manufacturer).localeCompare(String(b.manufacturer)) || String(a.code).localeCompare(String(b.code)));
fs.writeFileSync(dataPath, `${JSON.stringify(existingProducts, null, 2)}\n`);

console.log(`pdfProductsListed=${products.length}`);
console.log(`added=${added}`);
console.log(`total=${existingProducts.length}`);
