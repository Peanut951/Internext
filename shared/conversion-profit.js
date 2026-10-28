export const RESELLER_MARGIN_RATE = 0.2;
export const GST_RATE = 0.1;
export const CONVERSION_VALUE_BASIS = "gross_profit_ex_gst_before_freight_and_fees";

const normalizeMoney = (value) => Math.round(value * 100) / 100;

export const deriveSupplierCostExGst = (resellerPriceExGst) => {
  if (resellerPriceExGst === null || resellerPriceExGst === undefined || resellerPriceExGst === "") {
    return null;
  }

  const price = Number(resellerPriceExGst);
  if (!Number.isFinite(price) || price < 0) {
    return null;
  }

  return normalizeMoney(price / (1 + RESELLER_MARGIN_RATE));
};

export const calculateGrossProfitConversionValue = (items, options = {}) => {
  const discountRate = Math.min(Math.max(Number(options.discountRate) || 0, 0), 0.9);
  let complete = true;
  let grossProfit = 0;

  for (const item of items || []) {
    const sellPrice = Number(item?.sellPrice);
    const supplierCostExGst = Number(item?.supplierCostExGst);
    const quantity = Math.max(0, Math.floor(Number(item?.quantity) || 0));

    if (
      !Number.isFinite(sellPrice) ||
      sellPrice < 0 ||
      !Number.isFinite(supplierCostExGst) ||
      supplierCostExGst < 0 ||
      quantity < 1
    ) {
      complete = false;
      continue;
    }

    const sellPriceExGst = item.sellPriceIncludesGst
      ? sellPrice / (1 + GST_RATE)
      : sellPrice;
    const discountedRevenueExGst = sellPriceExGst * (1 - discountRate) * quantity;
    grossProfit += discountedRevenueExGst - supplierCostExGst * quantity;
  }

  return {
    value: normalizeMoney(Math.max(0, grossProfit)),
    complete,
    basis: CONVERSION_VALUE_BASIS,
  };
};
