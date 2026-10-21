export const STANDARD_SHIPPING_RATE_INC_GST_AUD: number;
export const STANDARD_SHIPPING_SERVICE_CODE: string;
export const STANDARD_SHIPPING_SERVICE_NAME: string;

export const getStandardShippingService: () => {
  code: string;
  name: string;
  price: number;
  priceText: string;
};
