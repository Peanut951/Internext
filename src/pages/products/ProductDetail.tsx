import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Plus } from "lucide-react";

type CatalogProduct = {
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

type CartItem = CatalogProduct & { qty: number };

const formatPrice = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  return value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
};

const getStoredCart = (): CartItem[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem("internext-cart");
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
};

const saveStoredCart = (items: CartItem[]) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem("internext-cart", JSON.stringify(items));
};

const ProductDetail = () => {
  const { code } = useParams();
  const productCode = code || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadProduct = async () => {
      try {
        const response = await fetch("/data/catalog-products.json");
        if (!response.ok) {
          throw new Error("Unable to load product data.");
        }
        const data = (await response.json()) as CatalogProduct[];
        const found = data.find((item) => item.code === productCode) || null;
        if (isMounted) {
          setProduct(found);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load product.");
          setLoading(false);
        }
      }
    };

    loadProduct();
    return () => {
      isMounted = false;
    };
  }, [productCode]);

  const displayPrice = useMemo(() => {
    if (!product) {
      return "";
    }
    return formatPrice(product.price) ?? product.priceText ?? "POA";
  }, [product]);

  const addToCart = () => {
    if (!product) {
      return;
    }
    const existing = getStoredCart();
    const match = existing.find((item) => item.code === product.code);
    const updated = match
      ? existing.map((item) =>
          item.code === product.code ? { ...item, qty: item.qty + qty } : item,
        )
      : [...existing, { ...product, qty }];
    saveStoredCart(updated);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Layout>
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="mb-6">
            <Link to="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent">
              <ArrowLeft className="h-4 w-4" />
              Back to Products
            </Link>
          </div>

          {loading && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              Loading product...
            </div>
          )}

          {error && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && !product && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              Product not found.
            </div>
          )}

          {!loading && !error && product && (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
                <div className="aspect-square bg-muted rounded-xl flex items-center justify-center overflow-hidden mb-6">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.description}
                      className="h-full w-full object-contain"
                      loading="eager"
                    />
                  ) : (
                    <span className="text-muted-foreground text-sm">No image</span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-3">{product.description}</h1>
                <p className="text-sm text-muted-foreground mb-1">Brand: {product.manufacturer || "N/A"}</p>
                <p className="text-sm text-muted-foreground mb-1">Product Code: {product.code}</p>
                {product.supplierCode ? (
                  <p className="text-sm text-muted-foreground mb-6">Reference Code: {product.supplierCode}</p>
                ) : null}
                <div className="bg-secondary rounded-xl p-4">
                  <h2 className="text-base font-semibold text-foreground mb-2">Description</h2>
                  <p className="text-sm text-muted-foreground">{product.description}</p>
                </div>
              </div>

              <aside className="bg-card rounded-2xl p-6 shadow-card border border-border/50 h-fit lg:sticky lg:top-24">
                <p className="text-sm text-muted-foreground mb-2">Price</p>
                <p className="text-3xl font-bold text-foreground mb-2">{displayPrice}</p>
                {product.rrp ? (
                  <p className="text-sm text-muted-foreground mb-6">
                    RRP {formatPrice(product.rrp)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mb-6">RRP not listed</p>
                )}

                <div className="mb-5">
                  <p className="text-sm font-medium text-foreground mb-2">Quantity</p>
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty((value) => Math.max(1, value - 1))}
                      className="h-9 w-9 border border-border rounded-md flex items-center justify-center hover:bg-secondary"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty((value) => value + 1)}
                      className="h-9 w-9 border border-border rounded-md flex items-center justify-center hover:bg-secondary"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <Button className="w-full" onClick={addToCart}>
                  {added ? "Added to Cart" : "Add to Cart"}
                </Button>

                <Button variant="outline" className="w-full mt-3" asChild>
                  <Link to="/products">Browse More Products</Link>
                </Button>
              </aside>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default ProductDetail;
