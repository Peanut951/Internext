import { isCatalogProductExcluded } from "./catalog-product-exclusions.js";

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
  if (isCatalogProductExcluded(product)) return false;

  const text = getProductClassificationText(product);
  const offerText = getOfferClassificationText(product);
  const debrandedOfferText = removeLeadingManufacturer(offerText, product.manufacturer);
  if (!text) return true;

  const leaderCategory = cleanClassificationText(product.leaderCategory);
  if (/^(?:software|services?|subscriptions?|licen[cs]es?|warrant(?:y|ies)|support|maintenance)$/.test(leaderCategory)) {
    return false;
  }

  // These are deliberately specific: generic words such as "extra" and
  // "post" also begin legitimate physical product names.
  const leadingIntangiblePattern =
    /^(?:[a-z0-9&.+-]+\s+){0,4}(?:\d+\s*)?(?:warranty|care\s*pack|cover\s*plus|coverplus|service\s*pack|phone\s+service|renewal|licen[cs]e|subscription|software|cloud\s+service|managed\s+service|professional\s+service|installation\s+service)\b/i;
  const intangiblePattern =
    /\b(?:microsoft\s*365|office\s*365|defender\s+suite|subscription|renewal|licen[cs]e|digital\s+download|virtual\s+item|software\s+(?:download|licen[cs]e|subscription|upgrade|assurance)|cloud\s+service|saas|care\s*pack|cover\s*plus|coverplus|service\s*pack|support\s*(?:pack|plan|contract|agreement|service)|phone\s+service|post\s*warranty|extended\s+warranty|warranty\s+(?:renewal|upgrade|extension|service|pack|uplift)|hardware\s+support|on(?:-|\s)?site\s+support|support\s*&\s*service|nbd\s+(?:support|response)|next\s+business\s+day\s+support|installation\s+service|professional\s+service|managed\s+service|preventive\s+maintenance\s+service|training\s+(?:service|course|session)|bootcamp|postscript\s+upgrade|pdf\s+upgrade|additional\s+(?:year|years)|total\s+of\s+\d+\s+(?:year|years)|response\s+service|repair\s+service|exchange\s+service|asap\s+exchange|adv(?:anced)?\s+exch(?:ange)?\s+nbd\s+response|upgrade\s+to\s+onsite\s+repair|return\s+to\s+support|react\s+fee|hw\s*(?:supp|suppor|support)|hws(?:upp)?|(?:\d+\s*)?(?:year|yr|month|mth)\s+(?:phone\s+)?service|(?:phone\s+)?service\s+(?:agreement|contract|plan|pack|renewal|support)|(?:\d+\s*)?(?:year|yr)\s+(?:partner\s+)?(?:poly\s+)?onsite|(?:\d+\s*)?(?:year|yr)\s+(?:ad|add|additional)\s+onsite\s+repair|phone(?:\s+[a-z0-9-]+){0,3}\s+service)\b/i;
  const durationServicePattern =
    /\b\d+\s*(?:year|years|yr|yrs|month|months|mth|mths)\s+(?:(?:next\s+business\s+day|nbd|on(?:-|\s)?site|return\s+to\s+base|advanced\s+exchange|asap\s+exchange|exchange|repair)\s*)+(?:service|support|warranty|exchange|repair)?\b/i;

  const startsLikeIntangible =
    leadingIntangiblePattern.test(offerText) || leadingIntangiblePattern.test(debrandedOfferText);
  const hasPhysicalSignal = hasPhysicalProductSignal(offerText);
  const isPhysicalBundle = hasPhysicalSignal && /\bbundle\b/i.test(offerText);

  if (
    startsLikeIntangible ||
    (intangiblePattern.test(offerText) && !isPhysicalBundle) ||
    (durationServicePattern.test(offerText) && !hasPhysicalSignal)
  ) {
    return false;
  }

  if (
    /\b(?:warranty|service)\b/i.test(offerText) &&
    /\b(?:additional|addl|extra|extended|post|renewal|upgrade|extension|support|onsite|on-site|nbd|response|repair|exchange|care|pack|agreement|contract|plan|total\s+of|swap\s+out|year|years|yr|yrs|mth|month|months)\b/i.test(offerText) &&
    (!hasPhysicalSignal || startsLikeIntangible)
  ) {
    return false;
  }

  return true;
};

export const filterTangibleCatalogProducts = (products) =>
  products.filter((product) => isTangibleCatalogProduct(product));
