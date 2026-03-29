import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import PortalNav from "@/components/auth/PortalNav";
import { CartItem, formatAud, getCartItems, saveCartItems } from "@/lib/orderManagement";
import { getPrimaryProductImage, handleProductImageError } from "@/lib/productImages";
import { ArrowLeft, ShoppingCart, Trash2 } from "lucide-react";

const Cart = () => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getCartItems());
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
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-foreground">{items.length} item(s)</h2>
                  <Button variant="outline" size="sm" onClick={clearCart}>
                    Clear Cart
                  </Button>
                </div>

                {items.map((item) => {
                  const lineTotal = item.price === null ? null : item.price * item.qty;
                  return (
                    <div
                      key={item.code}
                      className="bg-card border border-border/60 rounded-2xl p-5 shadow-card"
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
                            Unit price: {item.price === null ? item.priceText || "POA" : formatAud(item.price)}
                          </p>
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
                            {lineTotal === null ? item.priceText || "POA" : formatAud(lineTotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <aside className="bg-card border border-border/60 rounded-2xl p-6 shadow-card h-fit lg:sticky lg:top-24">
                <h3 className="text-lg font-semibold text-foreground mb-4">Summary</h3>
                <div className="space-y-2 text-sm mb-5">
                  <p className="flex items-center justify-between">
                    <span className="text-muted-foreground">Known subtotal</span>
                    <span className="font-semibold text-foreground">{formatAud(subtotal)}</span>
                  </p>
                  {poaLines > 0 ? (
                    <p className="text-xs text-muted-foreground">{poaLines} POA line(s) excluded from subtotal.</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Button className="w-full" asChild>
                    <Link to="/checkout">Proceed to Checkout</Link>
                  </Button>
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
