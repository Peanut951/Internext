import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CartItem,
  CheckoutCustomer,
  OrderRecord,
  formatAud,
  getCartItems,
  placeOrder,
} from "@/lib/orderManagement";
import { getPrimaryProductImage, handleProductImageError } from "@/lib/productImages";
import { ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";

const defaultCustomer: CheckoutCustomer = {
  firstName: "",
  lastName: "",
  company: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  suburb: "",
  state: "",
  postcode: "",
  country: "Australia",
  notes: "",
};

const Checkout = () => {
  const [customer, setCustomer] = useState<CheckoutCustomer>(defaultCustomer);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    setCartItems(getCartItems());
  }, []);

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      if (item.price === null) {
        return sum;
      }
      return sum + item.price * item.qty;
    }, 0);
  }, [cartItems]);

  const poaLines = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.price === null ? item.qty : 0), 0);
  }, [cartItems]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (cartItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setSubmitting(true);
    try {
      const order = await placeOrder(customer);
      setPlacedOrder(order);
      setCartItems([]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to place order.");
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">Checkout</h1>
          <p className="text-primary-foreground/80 max-w-2xl">
            Complete customer details and place the order. We will capture the order and route it
            for supplier fulfillment.
          </p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide">
          {placedOrder ? (
            <div className="max-w-3xl bg-card border border-border/50 rounded-2xl p-8 shadow-card">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle2 className="h-6 w-6 text-accent mt-0.5" />
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Order Placed</h2>
                  <p className="text-muted-foreground">Order number: {placedOrder.orderNumber}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm mb-6">
                <div className="bg-secondary rounded-lg p-4">
                  <p className="text-muted-foreground mb-1">Supplier Submission</p>
                  <p className="font-semibold text-foreground">{placedOrder.supplierStatus}</p>
                  <p className="text-xs text-muted-foreground mt-1">{placedOrder.supplierMessage}</p>
                </div>
                <div className="bg-secondary rounded-lg p-4">
                  <p className="text-muted-foreground mb-1">Known Value</p>
                  <p className="font-semibold text-foreground">{formatAud(placedOrder.totalKnownValue)}</p>
                  {placedOrder.poaLines > 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">{placedOrder.poaLines} POA line(s)</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/products">Continue Shopping</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/admin/orders">Open Admin Orders</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
              <form
                onSubmit={onSubmit}
                className="bg-card rounded-2xl p-7 shadow-card border border-border/50 space-y-5"
              >
                <h2 className="text-2xl font-bold text-foreground">Customer Details</h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">First Name *</label>
                    <Input
                      required
                      value={customer.firstName}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, firstName: event.target.value }))
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Name *</label>
                    <Input
                      required
                      value={customer.lastName}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, lastName: event.target.value }))
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Company</label>
                    <Input
                      value={customer.company}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, company: event.target.value }))
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <Input
                      type="email"
                      required
                      value={customer.email}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, email: event.target.value }))
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone *</label>
                    <Input
                      required
                      value={customer.phone}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, phone: event.target.value }))
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Country *</label>
                    <Input
                      required
                      value={customer.country}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, country: event.target.value }))
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Address Line 1 *</label>
                  <Input
                    required
                    value={customer.address1}
                    onChange={(event) =>
                      setCustomer((prev) => ({ ...prev, address1: event.target.value }))
                    }
                    className="bg-secondary border-0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Address Line 2</label>
                  <Input
                    value={customer.address2}
                    onChange={(event) =>
                      setCustomer((prev) => ({ ...prev, address2: event.target.value }))
                    }
                    className="bg-secondary border-0"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Suburb *</label>
                    <Input
                      required
                      value={customer.suburb}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, suburb: event.target.value }))
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">State *</label>
                    <Input
                      required
                      value={customer.state}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, state: event.target.value }))
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Postcode *</label>
                    <Input
                      required
                      value={customer.postcode}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, postcode: event.target.value }))
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Delivery Notes</label>
                  <Textarea
                    value={customer.notes}
                    onChange={(event) =>
                      setCustomer((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    className="bg-secondary border-0"
                    rows={4}
                  />
                </div>

                {error ? (
                  <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3">
                    {error}
                  </div>
                ) : null}

                <Button type="submit" className="w-full md:w-auto" disabled={submitting || cartItems.length === 0}>
                  {submitting ? "Submitting Order..." : "Place Order"}
                </Button>
              </form>

              <aside className="bg-card rounded-2xl p-6 shadow-card border border-border/50 h-fit lg:sticky lg:top-24">
                <h3 className="text-lg font-semibold text-foreground mb-4">Order Summary</h3>

                {cartItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-start gap-2 mb-4">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <p>Your cart is empty.</p>
                    </div>
                    <Link to="/products" className="text-accent hover:underline">
                      Browse products
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-[460px] overflow-auto pr-1">
                      {cartItems.map((item) => (
                        <div key={item.code} className="border border-border/60 rounded-lg p-3">
                          <div className="flex gap-3">
                            <img
                              src={getPrimaryProductImage(item)}
                              alt={item.description}
                              onError={handleProductImageError}
                              className="h-16 w-16 rounded-md border border-border/50 bg-white object-contain"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground break-words">{item.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.code} · Qty {item.qty}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.price === null ? item.priceText || "POA" : formatAud(item.price)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-border mt-4 pt-4 text-sm">
                      <p className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">Known subtotal</span>
                        <span className="font-semibold text-foreground">{formatAud(subtotal)}</span>
                      </p>
                      {poaLines > 0 ? (
                        <p className="text-xs text-muted-foreground">{poaLines} POA line(s) excluded from subtotal.</p>
                      ) : null}
                    </div>
                  </>
                )}
              </aside>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Checkout;
