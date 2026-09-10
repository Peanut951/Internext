const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

const firstValue = (...values) =>
  values.find((value) => value !== null && value !== undefined && String(value).trim() !== "");

const toMoney = (value) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
};

const toNonNegativeMoney = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null;
};

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return ["true", "yes", "1", "available", "in stock", "instock"].includes(
    String(value || "").trim().toLowerCase(),
  );
};

const toIsoTimestamp = (value, fallback) => {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
};

export const normalizeCompetitorDomain = (value) => {
  try {
    const url = String(value || "").includes("://")
      ? new URL(String(value))
      : new URL(`https://${String(value || "")}`);
    return url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  } catch {
    return "";
  }
};

export const isDomainApproved = (domain, approvedDomains) => {
  const normalized = normalizeCompetitorDomain(domain);
  return (Array.isArray(approvedDomains) ? approvedDomains : []).some((approved) => {
    const approvedDomain = normalizeCompetitorDomain(approved);
    return approvedDomain && (normalized === approvedDomain || normalized.endsWith(`.${approvedDomain}`));
  });
};

export const normalizePrisyncListing = (product, listing, options = {}) => {
  const productUrl = String(firstValue(listing?.url, listing?.product_url) || "").trim();
  const sellerDomain = normalizeCompetitorDomain(productUrl);
  const price = toMoney(firstValue(listing?.price, listing?.current_price, listing?.sale_price));
  if (!productUrl.startsWith("https://") || !sellerDomain || price === null) return null;

  const now = options.now || new Date().toISOString();
  const observedAt = toIsoTimestamp(
    firstValue(listing?.last_check, listing?.last_checked, listing?.updated_at),
    now,
  );

  return {
    provider: "prisync",
    providerProductId: String(firstValue(product?.id, product?.product_id) || "").trim(),
    providerListingId: String(firstValue(listing?.id, listing?.url_id, productUrl) || "").trim(),
    providerProductCode: String(
      firstValue(product?.external_ref, product?.product_code, product?.sku) || "",
    ).trim(),
    gtin: String(firstValue(product?.gtin, product?.ean, product?.upc, product?.barcode) || "").trim(),
    mpn: String(firstValue(product?.mpn, product?.manufacturer_part_number) || "").trim(),
    brand: String(firstValue(product?.brand?.name, product?.brand, product?.manufacturer) || "").trim(),
    productName: String(firstValue(product?.name, product?.product_name) || "").trim(),
    sellerName: String(firstValue(listing?.site_name, listing?.seller_name, sellerDomain) || sellerDomain).trim(),
    sellerDomain,
    productUrl,
    itemPriceIncGst: price,
    shippingPriceIncGst: toMoney(firstValue(listing?.shipping_price, listing?.shipping)) || 0,
    currency: String(firstValue(listing?.currency, options.currency, "AUD")).trim().toUpperCase(),
    inStock: toBoolean(firstValue(listing?.in_stock, listing?.available, listing?.availability)),
    observedAt,
    sourceReference: `prisync:${String(firstValue(listing?.id, listing?.url_id, productUrl))}`,
  };
};

const getPrice2SpyProducts = (payload) =>
  toArray(
    firstValue(
      payload?.products?.product,
      payload?.products,
      payload?.product,
      payload?.results,
      payload?.data,
    ),
  );

export const normalizePrice2SpyPayload = (payload, options = {}) => {
  const now = options.now || new Date().toISOString();
  const normalized = [];

  for (const product of getPrice2SpyProducts(payload)) {
    const listings = toArray(firstValue(product?.urls?.url, product?.urls, product?.url));
    for (const listing of listings) {
      const measurement = listing?.lastMeasurement || listing?.last_measurement || {};
      const priceNode = measurement?.price || listing?.price || {};
      const productUrl = String(firstValue(listing?.url, listing?.productUrl) || "").trim();
      const sellerDomain = normalizeCompetitorDomain(productUrl);
      const price = toMoney(firstValue(priceNode?.amount, priceNode, listing?.currentPrice));
      if (!productUrl.startsWith("https://") || !sellerDomain || price === null) continue;

      normalized.push({
        provider: "price2spy",
        providerProductId: String(firstValue(product?.productId, product?.id) || "").trim(),
        providerListingId: String(firstValue(listing?.urlId, listing?.id, productUrl) || "").trim(),
        providerProductCode: String(
          firstValue(product?.productCode, product?.sku, product?.externalRef, product?.note1) || "",
        ).trim(),
        gtin: String(firstValue(product?.gtin, product?.ean, product?.upc, product?.barcode) || "").trim(),
        mpn: String(firstValue(product?.mpn, product?.manufacturerPartNumber) || "").trim(),
        brand: String(firstValue(product?.brandName, product?.brand, product?.manufacturer) || "").trim(),
        productName: String(firstValue(product?.productName, product?.name) || "").trim(),
        sellerName: String(firstValue(listing?.siteHumanName, listing?.sellerName, sellerDomain) || sellerDomain).trim(),
        sellerDomain,
        productUrl,
        itemPriceIncGst: price,
        shippingPriceIncGst: toMoney(
          firstValue(listing?.shippingPrice?.amount, listing?.shippingPrice, measurement?.shipping),
        ) || 0,
        currency: String(firstValue(priceNode?.currency, listing?.currency, options.currency, "AUD"))
          .trim()
          .toUpperCase(),
        inStock: toBoolean(firstValue(measurement?.available, listing?.available, listing?.inStock)),
        observedAt: toIsoTimestamp(
          firstValue(measurement?.dateChecked, listing?.lastChecked, listing?.updatedAt),
          now,
        ),
        sourceReference: `price2spy:${String(firstValue(listing?.urlId, listing?.id, productUrl))}`,
      });
    }
  }

  return normalized;
};

const collectObjects = (value, predicate) => {
  const found = [];
  const visit = (current) => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!current || typeof current !== "object") return;
    if (predicate(current)) found.push(current);
    Object.values(current).forEach(visit);
  };
  visit(value);
  return found;
};

const splitSpecificationValues = (value) => {
  if (Array.isArray(value)) return value.flatMap(splitSpecificationValues);
  return String(value || "")
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
};

const getDataForSeoSpecifications = (payload) => {
  const values = new Map();
  const specifications = collectObjects(
    payload,
    (row) => Boolean(row?.specification_name) && row?.specification_value !== undefined,
  );
  for (const specification of specifications) {
    const name = String(specification.specification_name || "").trim().toLowerCase();
    values.set(name, [
      ...(values.get(name) || []),
      ...splitSpecificationValues(specification.specification_value),
    ]);
  }
  return values;
};

const getSpecificationValues = (specifications, pattern) =>
  [...specifications.entries()]
    .filter(([name]) => pattern.test(name))
    .flatMap(([, values]) => values);

const getDataForSeoProductNode = (payload) =>
  collectObjects(
    payload,
    (row) => Boolean(row?.product_id) && (
      Array.isArray(row?.sellers) ||
      Array.isArray(row?.specifications) ||
      Array.isArray(row?.offers)
    ),
  )[0] || null;

const getDataForSeoSellerRows = (productNode) => {
  if (!productNode) return [];
  const sellerRoot = firstValue(productNode.sellers, productNode.offers, productNode.items);
  return collectObjects(
    sellerRoot,
    (row) => Boolean(firstValue(row?.seller_url, row?.url, row?.product_url)) &&
      toMoney(firstValue(row?.base_price, row?.price?.current, row?.price?.regular, row?.total_price?.current)) !== null,
  );
};

const isNewCondition = (value) => {
  const condition = String(value || "new").trim().toLowerCase();
  return !/(used|refurbished|renewed|pre[- ]?owned|open box)/.test(condition);
};

export const normalizeDataForSeoProductInfo = (payload, product, options = {}) => {
  const productNode = getDataForSeoProductNode(payload);
  if (!productNode) return null;

  const specifications = getDataForSeoSpecifications(productNode);
  const observedGtins = getSpecificationValues(specifications, /^(gtin|ean|upc|barcode)s?$/i)
    .map(normalizeGtin)
    .filter(Boolean);
  const observedMpns = getSpecificationValues(
    specifications,
    /^(mpn|part number|part numbers|manufacturer part number|model number)s?$/i,
  ).map(normalizeIdentity).filter(Boolean);
  const observedBrands = getSpecificationValues(specifications, /^brand$/i)
    .map(normalizeIdentity)
    .filter(Boolean);

  const expectedGtins = [product?.gtin, product?.ean, product?.upc, product?.barcode]
    .map(normalizeGtin)
    .filter(Boolean);
  const expectedMpns = [product?.supplierCode, product?.code]
    .map(normalizeIdentity)
    .filter(Boolean);
  const expectedBrand = normalizeIdentity(product?.manufacturer);

  const gtinMatch = expectedGtins.some((gtin) => observedGtins.includes(gtin));
  const brandMpnMatch = Boolean(
    expectedBrand &&
    observedBrands.includes(expectedBrand) &&
    expectedMpns.some((mpn) => observedMpns.includes(mpn)),
  );
  const now = options.now || new Date().toISOString();
  const responseMetadata = collectObjects(
    payload,
    (row) => Boolean(row?.datetime || row?.timestamp || row?.updated_at),
  )[0] || {};
  const observedAt = toIsoTimestamp(
    firstValue(
      productNode.datetime,
      productNode.timestamp,
      productNode.updated_at,
      responseMetadata.datetime,
      responseMetadata.timestamp,
      responseMetadata.updated_at,
    ),
    now,
  );
  const providerProductId = String(productNode.product_id || "").trim();
  const productName = String(firstValue(productNode.title, productNode.product_name) || "").trim();
  const listings = [];

  for (const seller of getDataForSeoSellerRows(productNode)) {
    const productUrl = String(firstValue(seller.seller_url, seller.url, seller.product_url) || "").trim();
    const sellerDomain = normalizeCompetitorDomain(productUrl);
    const basePrice = toMoney(firstValue(
      seller.base_price,
      seller.price?.current,
      seller.price?.regular,
      typeof seller.price === "number" ? seller.price : undefined,
      seller.total_price?.current,
      seller.total_price?.regular,
      typeof seller.total_price === "number" ? seller.total_price : undefined,
    ));
    if (!productUrl.startsWith("https://") || !sellerDomain || basePrice === null) continue;

    const totalPrice = toMoney(firstValue(
      seller.total_price?.current,
      seller.total_price?.regular,
      typeof seller.total_price === "number" ? seller.total_price : undefined,
    ));
    const shippingNode = firstValue(
      seller.delivery_info?.delivery_price?.current,
      seller.delivery_info?.delivery_price?.regular,
      seller.delivery_info?.delivery_price,
      seller.shipping_price,
      seller.shipping,
    );
    const explicitShipping = toNonNegativeMoney(shippingNode);
    const shippingVerified = shippingNode !== undefined || totalPrice !== null;
    const shippingPrice = explicitShipping ?? (
      totalPrice !== null && totalPrice >= basePrice
        ? Math.round((totalPrice - basePrice) * 100) / 100
        : 0
    );
    const availability = firstValue(
      seller.product_availability,
      seller.availability,
      seller.in_stock,
    );
    const condition = String(firstValue(seller.product_condition, seller.condition, "new"));

    listings.push({
      provider: "dataforseo",
      providerProductId,
      providerListingId: String(firstValue(
        seller.data_docid,
        seller.id,
        seller.position,
        productUrl,
      )),
      providerProductCode: "",
      requestedProductCode: String(product?.code || "").trim(),
      gtin: observedGtins[0] || "",
      mpn: getSpecificationValues(
        specifications,
        /^(mpn|part number|part numbers|manufacturer part number|model number)s?$/i,
      )[0] || "",
      brand: getSpecificationValues(specifications, /^brand$/i)[0] || String(product?.manufacturer || ""),
      productName,
      sellerName: String(firstValue(seller.seller_name, seller.shop_name, seller.title, seller.name, sellerDomain)),
      sellerDomain,
      productUrl,
      itemPriceIncGst: basePrice,
      shippingPriceIncGst: shippingPrice,
      currency: String(firstValue(seller.currency, seller.price?.currency, options.currency, "AUD")).trim().toUpperCase(),
      inStock: toBoolean(availability) || /^(?:in[_ ]stock|limited[_ ]stock|available)$/i.test(String(availability || "").trim()),
      condition,
      isNew: isNewCondition(condition),
      shippingVerified,
      observedAt,
      sourceReference: `dataforseo:${providerProductId}:${String(firstValue(seller.data_docid, seller.id, productUrl))}:${String(options.locationName || "Australia")}`,
    });
  }

  return {
    providerProductId,
    productName,
    observedAt,
    matchMethod: gtinMatch ? "gtin" : brandMpnMatch ? "brand_mpn" : null,
    matchVerified: gtinMatch || brandMpnMatch,
    listings,
  };
};

const normalizeIdentity = (value) =>
  String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeGtin = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits) ? digits : "";
};

export const resolveExactCatalogMatch = (listing, products) => {
  const providerCode = normalizeIdentity(listing?.providerProductCode);
  const requestedProductCode = normalizeIdentity(listing?.requestedProductCode);
  const listingGtin = normalizeGtin(listing?.gtin) || normalizeGtin(listing?.providerProductCode);
  const listingBrand = normalizeIdentity(listing?.brand);
  const listingMpn = normalizeIdentity(listing?.mpn);

  for (const product of Array.isArray(products) ? products : []) {
    const productCode = String(product?.code || "").trim();
    if (requestedProductCode && normalizeIdentity(productCode) !== requestedProductCode) continue;
    const supplierCode = String(product?.supplierCode || "").trim();
    const productCodes = [productCode, supplierCode].map(normalizeIdentity).filter(Boolean);
    const productGtins = [product?.gtin, product?.ean, product?.upc, product?.barcode]
      .map(normalizeGtin)
      .filter(Boolean);

    if (listingGtin && productGtins.includes(listingGtin)) {
      return { product, matchMethod: "gtin", matchVerified: true };
    }
    if (providerCode && productCodes.includes(providerCode)) {
      return { product, matchMethod: "manual_verified", matchVerified: true };
    }
    if (
      listingBrand &&
      listingMpn &&
      listingBrand === normalizeIdentity(product?.manufacturer) &&
      productCodes.includes(listingMpn)
    ) {
      return { product, matchMethod: "brand_mpn", matchVerified: true };
    }
  }

  return null;
};
