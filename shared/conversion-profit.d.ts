export const RESELLER_MARGIN_RATE: number;
export const GST_RATE: number;
export const CONVERSION_VALUE_BASIS: string;

export const deriveSupplierCostExGst: (resellerPriceExGst: unknown) => number | null;

export type GrossProfitConversionItem = {
  sellPrice: number;
  supplierCostExGst: number;
  quantity: number;
  sellPriceIncludesGst: boolean;
};

export const calculateGrossProfitConversionValue: (
  items: GrossProfitConversionItem[],
  options?: { discountRate?: number },
) => {
  value: number;
  complete: boolean;
  basis: string;
};
