import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, ShoppingCart, Truck } from "lucide-react";

const ALLOYS_ORDER_EMAIL = "orders@alloys.com.au";
const ITEMS_PER_PAGE = 24;

type AlloysProduct = {
  code: string;
  manufacturer: string;
  description: string;
  price: number | null;
  priceText?: string;
  rrp: number | null;
  rrpText?: string;
  imageUrl?: string;
  supplierCode?: string;
};

type CartItem = AlloysProduct & { qty: number };

type OrderForm = {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  notes: string;
};

const formatPrice = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  return value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

const AlloysCatalog = () => {
  const [products, setProducts] = useState<AlloysProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [manufacturer, setManufacturer] = useState("All");
  const [sort, setSort] = useState("featured");
  const [page, setPage] = useState(1);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderForm, setOrderForm] = useState<OrderForm>({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postcode: "",
    country: "Australia",
    notes: "",
  });

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      try {
        const response = await fetch("/data/alloys-products.json");
        if (!response.ok) {
          throw new Error("Unable to load the Alloys catalog.");
        }
        const data = (await response.json()) as AlloysProduct[];
        if (isMounted) {
          setProducts(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load products.");
          setLoading(false);
        }
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const manufacturers = useMemo(() => {
    const values = new Set<string>();
    products.forEach((product) => {
      const value = product.manufacturer?.trim() || "Unbranded";
      values.add(value);
    });
    return ["All", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const search = normalize(query);
    const filtered = products.filter((product) => {
      const productManufacturer = product.manufacturer?.trim() || "Unbranded";
      if (manufacturer !== "All" && productManufacturer !== manufacturer) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [
        product.description,
        product.code,
        product.manufacturer,
        product.supplierCode,
      ]
        .filter(Boolean)
        .some((field) => normalize(field ?? "").includes(search));
    });

    if (sort === "name-asc") {
      return [...filtered].sort((a, b) => a.description.localeCompare(b.description));
    }

    if (sort === "name-desc") {
      return [...filtered].sort((a, b) => b.description.localeCompare(a.description));
    }

    if (sort === "price-asc") {
      return [...filtered].sort((a, b) => {
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return a.price - b.price;
      });
    }

    if (sort === "price-desc") {
      return [...filtered].sort((a, b) => {
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return b.price - a.price;
      });
    }

    return filtered;
  }, [products, manufacturer, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setPage(1);
  }, [query, manufacturer, sort]);

  const addToCart = (product: AlloysProduct) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.code === product.code);
      if (existing) {
        return prev.map((item) =>
          item.code === product.code ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (code: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.code === code ? { ...item, qty: Math.max(1, item.qty + delta) } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const removeItem = (code: string) => {
    setCartItems((prev) => prev.filter((item) => item.code !== code));
  };

  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      if (item.price === null) {
        return total;
      }
      return total + item.price * item.qty;
    }, 0);
  }, [cartItems]);

  const buildOrderBody = () => {
    const lines = cartItems.map((item) => {
      const priceLabel = formatPrice(item.price) ?? item.priceText ?? "POA";
      return `${item.qty} x ${item.code} - ${item.description} (${priceLabel})`;
    });

    return [
      "Drop-Ship Order Request",
      "",
      "Customer Details",
      `Name: ${orderForm.name}`,
      `Company: ${orderForm.company}`,
      `Email: ${orderForm.email}`,
      `Phone: ${orderForm.phone}`,
      "",
      "Shipping Address",
      `${orderForm.address}`,
      `${orderForm.city} ${orderForm.state} ${orderForm.postcode}`.trim(),
      `${orderForm.country}`,
      "",
      "Order Items",
      ...lines,
      "",
      `Total (excl. POA items): ${formatPrice(cartTotal) ?? "N/A"}`,
      "",
      `Notes: ${orderForm.notes || "None"}`,
    ].join("\n");
  };

  const sendOrderEmail = () => {
    if (cartItems.length === 0) {
      return;
    }
    const subject = `Drop-Ship Order (${cartItems.length} items)`;
    const body = buildOrderBody();
    const mailto = `mailto:${ALLOYS_ORDER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const downloadOrderCsv = () => {
    if (cartItems.length === 0) {
      return;
    }

    const headerRows = [
      ["Field", "Value"],
      ["Name", orderForm.name],
      ["Company", orderForm.company],
      ["Email", orderForm.email],
      ["Phone", orderForm.phone],
      ["Address", orderForm.address],
      ["City", orderForm.city],
      ["State", orderForm.state],
      ["Postcode", orderForm.postcode],
      ["Country", orderForm.country],
      ["Notes", orderForm.notes],
      [],
      ["Code", "Description", "Manufacturer", "Supplier Code", "Qty", "Price"],
    ];

    const rows = cartItems.map((item) => [
      item.code,
      item.description,
      item.manufacturer || "",
      item.supplierCode || "",
      String(item.qty),
      formatPrice(item.price) ?? item.priceText ?? "POA",
    ]);

    const csv = [...headerRows, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "alloys-drop-ship-order.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container-wide">
          <div className="max-w-3xl">
            <p className="text-primary-foreground/80 mb-3 text-sm uppercase tracking-[0.2em]">
              Alloys Drop-Ship Catalog
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              Order Direct From Alloys
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              Browse the full Alloys product list, add items to your order, and send a
              drop-ship request directly to Alloys for fulfillment.
            </p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
                <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by product name, code, or manufacturer"
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      className="bg-secondary border-0 rounded-md px-3 py-2 text-sm"
                      value={manufacturer}
                      onChange={(event) => setManufacturer(event.target.value)}
                    >
                      {manufacturers.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <select
                      className="bg-secondary border-0 rounded-md px-3 py-2 text-sm"
                      value={sort}
                      onChange={(event) => setSort(event.target.value)}
                    >
                      <option value="featured">Sort by: Featured</option>
                      <option value="name-asc">Name A-Z</option>
                      <option value="name-desc">Name Z-A</option>
                      <option value="price-asc">Price Low-High</option>
                      <option value="price-desc">Price High-Low</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>{filteredProducts.length} products</span>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
              </div>

              {loading && (
                <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                  Loading catalog...
                </div>
              )}

              {error && (
                <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-destructive">
                  {error}
                </div>
              )}

              {!loading && !error && (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {pageItems.map((product) => {
                    const priceLabel = formatPrice(product.price) ?? product.priceText ?? "POA";
                    return (
                      <div
                        key={product.code}
                        className="bg-card rounded-xl p-4 shadow-card border border-border/50 hover:shadow-elevated transition-shadow flex flex-col"
                      >
                        <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.description}
                              loading="lazy"
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <span className="text-muted-foreground text-sm">No image</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-1 line-clamp-2">
                            {product.description}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-1">{product.manufacturer}</p>
                          <p className="text-xs text-muted-foreground mb-3">Code: {product.code}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-sm font-semibold text-foreground">{priceLabel}</span>
                          {product.rrp ? (
                            <span className="text-xs text-muted-foreground">
                              RRP {formatPrice(product.rrp)}
                            </span>
                          ) : null}
                        </div>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => addToCart(product)}>
                          Add to Order
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {!loading && !error && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50 xl:sticky xl:top-24">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="h-5 w-5 text-accent" />
                  <h3 className="text-lg font-semibold text-foreground">Order Summary</h3>
                </div>

                {cartItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add items from the catalog to start a drop-ship order.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.code} className="border border-border/50 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground line-clamp-2">
                              {item.description}
                            </p>
                            <p className="text-xs text-muted-foreground">{item.code}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.code)}
                            className="text-xs text-muted-foreground hover:text-accent"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQty(item.code, -1)}
                              className="h-8 w-8 border border-border rounded-md flex items-center justify-center hover:bg-secondary"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-semibold w-6 text-center">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.code, 1)}
                              className="h-8 w-8 border border-border rounded-md flex items-center justify-center hover:bg-secondary"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {formatPrice(item.price) ?? item.priceText ?? "POA"}
                          </span>
                        </div>
                      </div>
                    ))}

                    <div className="border-t border-border pt-4 text-sm text-muted-foreground">
                      <p className="flex items-center justify-between">
                        <span>Subtotal</span>
                        <span className="text-foreground font-semibold">
                          {formatPrice(cartTotal) ?? "N/A"}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Total excludes POA items.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="default" onClick={sendOrderEmail} className="w-full">
                        Send Order to Alloys
                      </Button>
                      <Button variant="outline" onClick={downloadOrderCsv} className="w-full">
                        Download Order CSV
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="h-5 w-5 text-accent" />
                  <h3 className="text-lg font-semibold text-foreground">Shipping Details</h3>
                </div>
                <div className="grid gap-3">
                  <Input
                    placeholder="Contact name"
                    value={orderForm.name}
                    onChange={(event) => setOrderForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <Input
                    placeholder="Company"
                    value={orderForm.company}
                    onChange={(event) => setOrderForm((prev) => ({ ...prev, company: event.target.value }))}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={orderForm.email}
                    onChange={(event) => setOrderForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                  <Input
                    placeholder="Phone"
                    value={orderForm.phone}
                    onChange={(event) => setOrderForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                  <Input
                    placeholder="Street address"
                    value={orderForm.address}
                    onChange={(event) => setOrderForm((prev) => ({ ...prev, address: event.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="City"
                      value={orderForm.city}
                      onChange={(event) => setOrderForm((prev) => ({ ...prev, city: event.target.value }))}
                    />
                    <Input
                      placeholder="State"
                      value={orderForm.state}
                      onChange={(event) => setOrderForm((prev) => ({ ...prev, state: event.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Postcode"
                      value={orderForm.postcode}
                      onChange={(event) => setOrderForm((prev) => ({ ...prev, postcode: event.target.value }))}
                    />
                    <Input
                      placeholder="Country"
                      value={orderForm.country}
                      onChange={(event) => setOrderForm((prev) => ({ ...prev, country: event.target.value }))}
                    />
                  </div>
                  <Textarea
                    placeholder="Delivery notes"
                    value={orderForm.notes}
                    onChange={(event) => setOrderForm((prev) => ({ ...prev, notes: event.target.value }))}
                    className="min-h-[90px]"
                  />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default AlloysCatalog;
