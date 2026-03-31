import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PortalNav from "@/components/auth/PortalNav";
import {
  CartItem,
  CheckoutCustomer,
  OrderRecord,
  OrderReseller,
  formatAud,
  getCartItems,
  placeOrder,
} from "@/lib/orderManagement";
import { getPrimaryProductImage, handleProductImageError } from "@/lib/productImages";
import { ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuthSession } from "@/hooks/use-auth-session";

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

type AddressLookupResult = {
  place_id: number;
  formatted: string;
  address_line1?: string;
  address_line2?: string;
  housenumber?: string;
  street?: string;
  suburb?: string;
  city?: string;
  state?: string;
  state_code?: string;
  postcode?: string;
  country?: string;
};

const getLineOneFromLookup = (result: AddressLookupResult) => {
  const addressLine1 = result.address_line1?.trim();
  if (addressLine1) {
    return addressLine1;
  }

  const houseNumber = result.housenumber?.trim();
  const road = result.street?.trim();

  if (houseNumber && road) {
    return `${houseNumber} ${road}`;
  }

  return road || result.formatted.split(",")[0]?.trim() || "";
};

const getSuburbFromLookup = (result: AddressLookupResult) =>
  result.suburb?.trim() ||
  result.city?.trim() ||
  "";

const getFormattedParts = (result: AddressLookupResult) =>
  result.formatted
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const getAddressLineTwoFromLookup = (result: AddressLookupResult, suburb: string) => {
  const addressLine2 = result.address_line2?.trim();
  if (addressLine2) {
    return addressLine2;
  }

  const parts = getFormattedParts(result);
  const lineOne = getLineOneFromLookup(result).toLowerCase();
  const suburbLower = suburb.toLowerCase();

  return (
    parts.find((part) => {
      const normalized = part.toLowerCase();
      return normalized !== lineOne && normalized !== suburbLower;
    }) || ""
  );
};

const getStateFromLookup = (result: AddressLookupResult) => {
  const stateCode = result.state_code?.trim();
  if (stateCode) {
    return stateCode.toUpperCase();
  }

  const state = result.state?.trim();
  if (!state) {
    return "";
  }

  const stateMap: Record<string, string> = {
    "New South Wales": "NSW",
    Victoria: "VIC",
    Queensland: "QLD",
    Tasmania: "TAS",
    "South Australia": "SA",
    "Western Australia": "WA",
    "Northern Territory": "NT",
    "Australian Capital Territory": "ACT",
  };

  return stateMap[state] || state;
};

const GEOAPIFY_API_KEY = (import.meta.env.VITE_GEOAPIFY_API_KEY as string | undefined)?.trim() || "";

const Checkout = () => {
  const [customer, setCustomer] = useState<CheckoutCustomer>(defaultCustomer);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<OrderRecord | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressLookupResult[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressLookupMessage, setAddressLookupMessage] = useState<string | null>(null);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [selectedAddressLabel, setSelectedAddressLabel] = useState<string | null>(null);
  const { session } = useAuthSession();

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

  useEffect(() => {
    const query = customer.address1.trim();

    if (!GEOAPIFY_API_KEY) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      setAddressLookupMessage(null);
      return;
    }

    if (query.length < 5 || query === selectedAddressLabel) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      setAddressLookupMessage(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setAddressLoading(true);
      setAddressLookupMessage(null);

      try {
        const params = new URLSearchParams({
          format: "json",
          limit: "7",
          filter: "countrycode:au",
          text: query,
          lang: "en",
          apiKey: GEOAPIFY_API_KEY,
        });

        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error("Address lookup is currently unavailable.");
        }

        const payload = (await response.json()) as { results?: AddressLookupResult[] };
        const results = payload.results ?? [];
        setAddressSuggestions(results);
        setShowAddressSuggestions(true);
        setAddressLookupMessage(results.length === 0 ? "No matching addresses found." : null);
      } catch (lookupError) {
        if (lookupError instanceof Error && lookupError.name === "AbortError") {
          return;
        }

        setAddressSuggestions([]);
        setAddressLookupMessage(
          lookupError instanceof Error
            ? lookupError.message
            : "Address lookup is currently unavailable.",
        );
      } finally {
        setAddressLoading(false);
      }
    }, 1100);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [customer.address1, selectedAddressLabel]);

  const applyAddressSuggestion = (result: AddressLookupResult) => {
    const address1 = getLineOneFromLookup(result);
    const suburb = getSuburbFromLookup(result);
    const address2 = getAddressLineTwoFromLookup(result, suburb);
    const state = getStateFromLookup(result);
    const postcode = result.address?.postcode?.trim() || "";
    const country = result.address?.country?.trim() || "Australia";

    setCustomer((prev) => ({
      ...prev,
      address1,
      address2: address2 || prev.address2,
      suburb: suburb || prev.suburb,
      state: state || prev.state,
      postcode: postcode || prev.postcode,
      country,
    }));
    setSelectedAddressLabel(address1);
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
    setAddressLookupMessage(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (cartItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setSubmitting(true);
    try {
      const reseller: OrderReseller | undefined = session
        ? {
            userId: session.userId,
            email: session.email,
            role: session.role,
          }
        : undefined;

      const order = await placeOrder(customer, reseller);
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
            to="/cart"
            className="inline-flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-primary-foreground mb-5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Cart
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
          <div className="mb-8">
            <PortalNav />
          </div>
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
                {session?.role === "admin" ? (
                  <Button asChild variant="outline">
                    <Link to="/admin/orders">Open Admin Orders</Link>
                  </Button>
                ) : null}
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
                      autoComplete="tel"
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
                      autoComplete="country-name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Address Line 1 *</label>
                  <div className="relative">
                    <Input
                      required
                      value={customer.address1}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setSelectedAddressLabel(null);
                        setCustomer((prev) => ({ ...prev, address1: nextValue }));
                        setShowAddressSuggestions(true);
                      }}
                      onFocus={() => {
                        if (addressSuggestions.length > 0 || addressLookupMessage) {
                          setShowAddressSuggestions(true);
                        }
                      }}
                      className="bg-secondary border-0"
                      autoComplete="address-line1"
                    />

                    {showAddressSuggestions &&
                    (customer.address1.trim().length >= 5 || addressLoading) ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 overflow-hidden rounded-xl border border-border/60 bg-card shadow-elevated">
                        {addressLoading ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            Looking up addresses...
                          </div>
                        ) : null}

                        {!addressLoading && addressSuggestions.length > 0 ? (
                          <div className="max-h-72 overflow-auto py-2">
                            {addressSuggestions.map((result) => (
                              <button
                                key={result.place_id}
                                type="button"
                                onClick={() => applyAddressSuggestion(result)}
                                className="block w-full px-4 py-3 text-left transition hover:bg-secondary/55"
                              >
                                <p className="text-sm font-medium text-foreground">
                                  {getLineOneFromLookup(result)}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                  {result.formatted}
                                </p>
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {!addressLoading && addressLookupMessage ? (
                          <div className="border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">
                            {addressLookupMessage}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Address Line 2</label>
                  <Input
                    value={customer.address2}
                    onChange={(event) =>
                      setCustomer((prev) => ({ ...prev, address2: event.target.value }))
                    }
                    className="bg-secondary border-0"
                    autoComplete="address-line2"
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
                      autoComplete="address-level2"
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
                      autoComplete="address-level1"
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
                      autoComplete="postal-code"
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
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Order Summary</h3>
                  <Link to="/cart" className="text-xs text-accent hover:underline">
                    Edit cart
                  </Link>
                </div>

                {cartItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-start gap-2 mb-4">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <p>Your cart is empty.</p>
                    </div>
                    <Link to="/cart" className="text-accent hover:underline">
                      Return to cart
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
