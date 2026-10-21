export const STANDARD_SHIPPING_RATE_INC_GST_AUD = 15;
export const STANDARD_SHIPPING_SERVICE_CODE = "INTERNEXT_FLAT_RATE";
export const STANDARD_SHIPPING_SERVICE_NAME = "Standard delivery (inc GST)";

export const getStandardShippingService = () => ({
  code: STANDARD_SHIPPING_SERVICE_CODE,
  name: STANDARD_SHIPPING_SERVICE_NAME,
  price: STANDARD_SHIPPING_RATE_INC_GST_AUD,
  priceText: STANDARD_SHIPPING_RATE_INC_GST_AUD.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  }),
});
