import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import PortalNav from "@/components/auth/PortalNav";
import { useAuthSession } from "@/hooks/use-auth-session";
import { CartItem, getCartItems, saveCartItems } from "@/lib/orderManagement";
import { loadCatalogProducts } from "@/lib/liveCatalog";
import { getPrimaryProductImage, handleProductImageError } from "@/lib/productImages";
import { formatStoredPrice, formatStoredTotal } from "@/lib/pricing";
import { ArrowLeft, ShoppingCart, Trash2 } from "lucide-react";

const refreshCartStock = async (items: CartItem[]) => {
  if (items.length === 0) {
    return items;
  }

  const liveProducts = await loadCatalogProducts();
  const liveByCode = new Map(
    liveProducts.flatMap((product) =>
      [product.code, product.supplierCode]
        .map((value) => value?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value))
        .map((key) => [key, product] as const),
    ),
  );

  return items.map((item) => {
    const live = [item.code, item.supplierCode]
      .map((value) => value?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value))
      .map((key) => liveByCode.get(key))
      .find(Boolean);

    return live
      ? {
          ...item,
          availabilityText: live.availabilityText,
          etaDate: live.etaDate,
          etaStatus: live.etaStatus,
          stockQuantity: live.stockQuantity,
        }
      : item;
  });
};

const getOutOfStockEtaMessage = (item: CartItem) => {
  const etaDate = item.etaDate?.trim();
  if (etaDate) {
    return `Out of stock. ETA: ${etaDate}`;
  }

  const etaStatus = item.etaStatus?.trim();
  if (etaStatus && !/^(check availability|in stock)$/i.test(etaStatus)) {
    if (/^contact us/i.test(etaStatus)) {
      return etaStatus;
    }

    return `Out of stock. ETA: ${etaStatus}`;
  }

  return "Out of stock. For ETA please call 1300 567 835.";
};

const Cart = () => {
  const { session } = useAuthSession();
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const storedItems = getCartItems();
    setItems(storedItems);

    let isActive = true;
    void refreshCartStock(storedItems)
      .then((updatedItems) => {
        if (!isActive) {
          return;
        }

        setItems(updatedItems);
        saveCartItems(updatedItems);
      })
      .catch(() => {
        // Keep the cart usable if the live catalogue refresh fails.
      });

    return () => {
      isActive = false;
    };
  }, []);

  const setAndPersist = (next: CartItem[]) => {
    setItems(next);
    saveCartItems(next);
  };

  const removeItem = (code: string) => {
    setAndPersist(items.filter((item) => item.code !== code));
  };

  const updateQty = (code: string, delta: number) => {
    const nextItems = items
      .map((item) => {
        if (item.code !== code) {
          return item;
        }

        const nextQty = item.qty + delta;
        return { ...item, qty: nextQty };
      })
      .filter((item) => item.qty > 0);

    setAndPersist(nextItems);
  };

  const clearCart = () => setAndPersist([]);

  const subtotal = useMemo(() => {
    return items.reduce((total, item) => {
      if (item.price === null) {
        return total;
      }
      return total + item.price * item.qty;
    }, 0);
  }, [items]);

  const poaLines = useMemo(() => {
    return items.reduce((total, item) => total + (item.price === null ? item.qty : 0), 0);
  }, [items]);
  const unavailableItems = useMemo(
    () => items.filter((item) => typeof item.stockQuantity === "number" && item.stockQuantity <= 0),
    [items],
  );
  const stockLimitedItems = useMemo(
    () =>
      items.filter(
        (item) =>
          typeof item.stockQuantity === "number" &&
          item.stockQuantity > 0 &&
          item.qty > item.stockQuantity,
      ),
    [items],
  );
  const hasStockBlockingItems = unavailableItems.length > 0 || stockLimitedItems.length > 0;
  const checkoutPath = session ? "/checkout" : `/login?redirect=${encodeURIComponent("/checkout")}&guest=1`;

  return (
    <Layout>
      <section className="bg-gradient-hero py-14 md:py-20">
        <div className="container-wide">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-primary-foreground mb-5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">Cart</h1>
          <p className="text-primary-foreground/80 max-w-2xl">
            Review products, adjust quantities, and remove items before proceeding to checkout.
          </p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="mb-8">
            <PortalNav />
          </div>
          {items.length === 0 ? (
            <div className="max-w-3xl bg-card border border-border/60 rounded-2xl p-8 shadow-card text-center">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">Add products from the catalogue to start an order.</p>
              <Button asChild>
                <Link to="/products">Browse Products</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-foreground">{items.length} item(s)</h2>
                  <Button variant="outline" size="sm" onClick={clearCart}>
                    Clear Cart
                  </Button>
                </div>

                {items.map((item) => {
                  const lineTotal = item.price === null ? null : item.price * item.qty;
                  const isUnavailable = typeof item.stockQuantity === "number" && item.stockQuantity <= 0;
                  const exceedsAvailable =
                    typeof item.stockQuantity === "number" &&
                    item.stockQuantity > 0 &&
                    item.qty > item.stockQuantity;
                  return (
                    <div
                      key={item.code}
                      className={`bg-card border rounded-2xl p-5 shadow-card ${
                        isUnavailable || exceedsAvailable
                          ? "border-destructive/40"
                          : "border-border/60"
                      }`}
                    >
                      <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center">
                        <img
                          src={getPrimaryProductImage(item)}
                          alt={item.description}
                          onError={handleProductImageError}
                          className="h-28 w-full sm:w-28 rounded-lg border border-border/50 bg-white object-contain"
                          loading="lazy"
                        />

                        <div>
                          <h3 className="font-semibold text-foreground leading-snug break-words">{item.description}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{item.manufacturer}</p>
                          <p className="text-xs text-muted-foreground mt-1">Code: {item.code}</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Unit price: {formatStoredPrice(item.price, item.priceText) ?? "POA"}
                          </p>
                          {typeof item.stockQuantity === "number" ? (
                            <p
                              className={`mt-2 text-sm ${
                                isUnavailable || exceedsAvailable ? "text-destructive" : "text-muted-foreground"
                              }`}
                            >
                              {isUnavailable
                                ? getOutOfStockEtaMessage(item)
                                : exceedsAvailable
                                  ? `Only ${item.stockQuantity.toLocaleString("en-AU")} available`
                                  : `${item.stockQuantity.toLocaleString("en-AU")} available`}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-col items-start sm:items-end gap-3">
                          <button
                            type="button"
                            onClick={() => removeItem(item.code)}
                            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" /> Remove
                          </button>

                          <div className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1">
                            <button
                              type="button"
                              onClick={() => updateQty(item.code, -1)}
                              className="h-8 w-8 rounded-md hover:bg-secondary"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-semibold">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.code, 1)}
                              className="h-8 w-8 rounded-md hover:bg-secondary"
                            >
                              +
                            </button>
                          </div>

                          <p className="text-sm font-semibold text-foreground">
                            {formatStoredPrice(lineTotal, item.priceText) ?? "POA"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <aside className="bg-card border border-border/60 rounded-2xl p-6 shadow-card h-fit xl:sticky xl:top-24">
                <h3 className="text-lg font-semibold text-foreground mb-4">Summary</h3>
                <div className="space-y-2 text-sm mb-5">
                  <p className="flex items-center justify-between">
                    <span className="text-muted-foreground">Known subtotal</span>
                    <span className="font-semibold text-foreground">{formatStoredTotal(subtotal, items)}</span>
                  </p>
                  {poaLines > 0 ? (
                    <p className="text-xs text-muted-foreground">{poaLines} POA line(s) excluded from subtotal.</p>
                  ) : null}
                  {unavailableItems.length > 0 ? (
                    <p className="text-xs text-destructive">Remove out-of-stock item(s) before checkout.</p>
                  ) : null}
                  {stockLimitedItems.length > 0 ? (
                    <p className="text-xs text-destructive">
                      Reduce item quantities to match available stock before checkout.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {hasStockBlockingItems ? (
                    <Button className="w-full" disabled>
                      Proceed to Checkout
                    </Button>
                  ) : (
                    <Button className="w-full" asChild>
                      <Link to={checkoutPath}>Proceed to Checkout</Link>
                    </Button>
                  )}
                  <Button className="w-full" variant="outline" asChild>
                    <Link to="/products">Continue Shopping</Link>
                  </Button>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Cart;
