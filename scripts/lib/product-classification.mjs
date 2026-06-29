const cleanClassificationText = (value) =>
  String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const getProductClassificationText = (product) =>
  cleanClassificationText(
    [
      product.code,
      product.supplierCode,
      product.manufacturer,
      product.name,
      product.description,
      product.leaderCategory,
      product.category,
      product.subcategory,
    ]
      .filter(Boolean)
      .join(" "),
  );

const hasPhysicalProductSignal = (text) =>
  /\b(?:adapter|adaptor|access\s*point|battery|bracket|cable|camera|cartridge|case|chair|charger|cord|desktop|display|dock|drum|filament|firewall|handset|hard\s*drive|headset|ink|intercom|keyboard|kit|laptop|lead|monitor|mount|mouse|nas|notebook|nvr|panel|paper|phone|power\s*bank|power\s*supply|printer|printhead|projector|remote|router|scanner|screen|server|speaker|stand|switch|tablet|toner|ups|webcam|workstation)\b/i.test(
    text,
  );

export const isTangibleCatalogProduct = (product) => {
  const text = getProductClassificationText(product);
  if (!text) {
    return true;
  }

  const leaderCategory = cleanClassificationText(product.leaderCategory);
  if (/^(?:software|services?|subscriptions?|licen[cs]es?|warrant(?:y|ies)|support)$/.test(leaderCategory)) {
    return false;
  }

  const intangiblePattern =
    /\b(?:microsoft\s*365|office\s*365|defender\s+suite|subscription|renewal|licen[cs]e|digital\s+download|software\s+(?:licen[cs]e|subscription|upgrade)|cloud\s+service|saas|care\s*pack|cover\s*plus|coverplus|service\s*pack|support\s*pack|post\s*warranty|extended\s*warranty|warranty\s+renewal|warranty\s+upgrade|hardware\s+support|onsite\s+support|on-site\s+support|nbd\s+support|next\s+business\s+day\s+support|installation\s+service|professional\s+service|managed\s+service|training\s+(?:service|course|session)|bootcamp|postscript\s+upgrade|pdf\s+upgrade)\b/i;

  if (intangiblePattern.test(text)) {
    return false;
  }

  if (
    /\bwarranty\b/i.test(text) &&
    /\b(?:renewal|support|onsite|on-site|nbd|response|repair|exchange|care|pack)\b/i.test(text) &&
    !hasPhysicalProductSignal(text)
  ) {
    return false;
  }

  return true;
};

export const filterTangibleCatalogProducts = (products) =>
  products.filter((product) => isTangibleCatalogProduct(product));
