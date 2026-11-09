export const STANDARD_SHIPPING_RATE_EX_GST_AUD = 15;
export const STANDARD_SHIPPING_RATE_INC_GST_AUD = 16.5;
export const STANDARD_SHIPPING_SERVICE_CODE = "INTERNEXT_FLAT_RATE";
export const STANDARD_SHIPPING_SERVICE_NAME = "Standard delivery ($15.00 ex GST)";

export const getStandardShippingService = () => ({
  code: STANDARD_SHIPPING_SERVICE_CODE,
  name: STANDARD_SHIPPING_SERVICE_NAME,
  priceExGst: STANDARD_SHIPPING_RATE_EX_GST_AUD,
  priceExGstText: STANDARD_SHIPPING_RATE_EX_GST_AUD.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  }),
  price: STANDARD_SHIPPING_RATE_INC_GST_AUD,
  priceText: STANDARD_SHIPPING_RATE_INC_GST_AUD.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  }),
});
