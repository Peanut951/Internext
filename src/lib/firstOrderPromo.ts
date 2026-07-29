const FIRST_ORDER_PROMO_COMPLETED_KEY = "internext-first-order-promo-completed";

export const hasCompletedFirstOrderOnDevice = () => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(FIRST_ORDER_PROMO_COMPLETED_KEY) === "true";
  } catch {
    return false;
  }
};

export const markFirstOrderCompletedOnDevice = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(FIRST_ORDER_PROMO_COMPLETED_KEY, "true");
  } catch {
    // Promo display state is non-critical if browser storage is unavailable.
  }
};
