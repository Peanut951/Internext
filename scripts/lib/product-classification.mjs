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

const getOfferClassificationText = (product) =>
  cleanClassificationText(
    [
      product.name,
      product.description,
      product.leaderCategory,
      product.category,
      product.subcategory,
    ]
      .filter(Boolean)
      .join(" "),
  );

const removeLeadingManufacturer = (text, manufacturer) => {
  const brand = cleanClassificationText(manufacturer);
  return brand && text.startsWith(`${brand} `) ? text.slice(brand.length).trim() : text;
};

const hasPhysicalProductSignal = (text) =>
  /\b(?:adapter|adaptor|access\s*point|battery|bracket|cable|camera|cartridge|case|chair|charger|cord|desktop|display|dock|drum|filament|firewall|handset|hard\s*drive|headset|ink|intercom|keyboard|kit|laptop|lead|monitor|mount|mouse|nas|notebook|nvr|panel|paper|phone|power\s*bank|power\s*supply|printer|printhead|projector|remote|router|scanner|screen|server|speaker|stand|switch|tablet|toner|ups|webcam|workstation)\b/i.test(
    text,
  );

export const isTangibleCatalogProduct = (product) => {
  const text = getProductClassificationText(product);
  const offerText = getOfferClassificationText(product);
  const debrandedOfferText = removeLeadingManufacturer(offerText, product.manufacturer);
  if (!text) {
    return true;
  }

  const leaderCategory = cleanClassificationText(product.leaderCategory);
  if (/^(?:software|services?|subscriptions?|licen[cs]es?|warrant(?:y|ies)|support|maintenance)$/.test(leaderCategory)) {
    return false;
  }

  const leadingIntangiblePattern =
    /^(?:[a-z0-9&.+-]+\s+){0,4}(?:\d+\s*)?(?:additional|extra|extended|post|onsite|on-site|nbd|next\s+business\s+day|warranty|support|care\s*pack|cover\s*plus|coverplus|service\s*pack|phone\s+service|renewal|licen[cs]e|subscription|software|cloud\s+service|managed\s+service|professional\s+service|installation\s+service)\b/i;
  const intangiblePattern =
    /\b(?:microsoft\s*365|office\s*365|defender\s+suite|subscription|renewal|licen[cs]e|digital\s+download|virtual\s+item|software\s+(?:download|licen[cs]e|subscription|upgrade|assurance)|cloud\s+service|saas|care\s*pack|cover\s*plus|coverplus|service\s*pack|support\s*pack|phone\s+service|post\s*warranty|extended\s*warranty|warranty\s+(?:renewal|upgrade|extension|service|pack)|hardware\s+support|onsite\s+support|on-site\s+support|nbd\s+support|next\s+business\s+day\s+support|installation\s+service|professional\s+service|managed\s+service|training\s+(?:service|course|session)|bootcamp|postscript\s+upgrade|pdf\s+upgrade|additional\s+(?:year|years)|total\s+of\s+\d+\s+(?:year|years)|response\s+service|repair\s+service|exchange\s+service|\b(?:\d+\s*)?(?:year|yr|month|mth)\s+(?:phone\s+)?service\b|\b(?:phone\s+)?service\s+(?:agreement|contract|plan|pack|renewal|support)\b)\b/i;

  const startsLikeIntangible =
    leadingIntangiblePattern.test(offerText) || leadingIntangiblePattern.test(debrandedOfferText);

  if (startsLikeIntangible || intangiblePattern.test(offerText)) {
    return false;
  }

  if (
    /\b(?:warranty|service)\b/i.test(offerText) &&
    /\b(?:additional|addl|extra|extended|post|renewal|upgrade|extension|support|onsite|on-site|nbd|response|repair|exchange|care|pack|agreement|contract|plan|total\s+of|swap\s+out|year|years|yr|yrs|mth|month|months)\b/i.test(offerText) &&
    (!hasPhysicalProductSignal(offerText) || startsLikeIntangible)
  ) {
    return false;
  }

  return true;
};

export const filterTangibleCatalogProducts = (products) =>
  products.filter((product) => isTangibleCatalogProduct(product));
