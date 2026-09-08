import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Check,
  ExternalLink,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import PortalNav from "@/components/auth/PortalNav";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

type PricingMode = "disabled" | "observe" | "active";
type ProductMode = "monitor_only" | "automatic" | "excluded";

type SyncRun = {
  id: string;
  provider: string;
  status: "running" | "completed" | "failed";
  products_read: number;
  listings_read: number;
  observations_stored: number;
  candidates_stored: number;
  requests_made: number;
  error_message?: string | null;
  started_at: string;
  finished_at?: string | null;
};

type Candidate = {
  id: string;
  provider: string;
  product_code: string;
  seller_name: string;
  seller_domain: string;
  competitor_product_url: string;
  observed_price_inc_gst: number;
  observed_shipping_inc_gst: number;
  currency: string;
  in_stock: boolean;
  match_method?: string | null;
  review_reason: string;
  status: "pending" | "approved" | "rejected";
  last_seen_at: string;
};

type Seller = {
  id: string;
  name: string;
  domain: string;
  provider?: string | null;
  verified: boolean;
  enabled: boolean;
  verified_at?: string | null;
};

type ObservationSeller = Pick<Seller, "name" | "domain" | "verified" | "enabled">;

type Observation = {
  id: string;
  product_code: string;
  supplier_code?: string | null;
  item_price_inc_gst: number;
  shipping_price_inc_gst: number;
  landed_price_inc_gst: number;
  in_stock: boolean;
  match_method: string;
  match_verified: boolean;
  observed_at: string;
  expires_at: string;
  competitor_product_url: string;
  seller?: ObservationSeller | ObservationSeller[] | null;
};

type Recommendation = {
  id: string;
  product_code: string;
  standard_price_inc_gst: number;
  minimum_allowed_price_inc_gst: number;
  competitor_price_inc_gst: number;
  recommended_price_inc_gst: number;
  status: "pending" | "approved" | "rejected" | "expired";
  decision_note?: string | null;
  generated_at: string;
  expires_at: string;
};

type ProductMatch = {
  product_code: string;
  provider: string;
  provider_product_id: string;
  provider_product_name?: string | null;
  match_method: "gtin" | "brand_mpn";
  verified: boolean;
  verified_at: string;
  last_seen_at: string;
};

type ProductControl = {
  product_code: string;
  mode: ProductMode;
  reason?: string | null;
  updated_by?: string | null;
  updated_at: string;
};

type PricingSummary = {
  mode: PricingMode;
  databaseEnabled: boolean;
  settings?: {
    undercut_amount_inc_gst?: number;
    observation_max_age_hours?: number;
    updated_at?: string;
  } | null;
  observations: Observation[];
  recommendations: Recommendation[];
  candidates: Candidate[];
  sellers: Seller[];
  syncRuns: SyncRun[];
  productControls: ProductControl[];
  productMatches: ProductMatch[];
};

const moneyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
});

const formatMoney = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? moneyFormatter.format(amount) : "-";
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-AU");
};

const formatLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

const statusClass = (status: string) => {
  if (["completed", "approved", "active"].includes(status)) return "bg-emerald-100 text-emerald-800";
  if (["failed", "rejected", "excluded", "disabled"].includes(status)) return "bg-red-100 text-red-800";
  if (["running", "pending", "automatic"].includes(status)) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="px-5 py-12 text-center text-sm text-muted-foreground">{text}</div>
);

const CompetitorPricingAdmin = () => {
  const { toast } = useToast();
  const [summary, setSummary] = useState<PricingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [actionId, setActionId] = useState("");
  const [savingProductCode, setSavingProductCode] = useState("");

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/catalog/competitor-pricing", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({})) as PricingSummary & {
        message?: string;
        detail?: string;
      };
      if (!response.ok) throw new Error(payload.detail || payload.message || "Competitor pricing data is unavailable.");
      setSummary(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Competitor pricing data is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const runScan = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const response = await fetch("/api/catalog/competitor-pricing", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run-provider-sync" }),
      });
      const payload = await response.json().catch(() => ({})) as {
        message?: string;
        detail?: string;
      };
      if (!response.ok) throw new Error(payload.detail || payload.message || "The competitor scan failed.");
      toast({ title: "Competitor scan completed", description: payload.message });
      await loadSummary();
    } catch (scanError) {
      toast({
        variant: "destructive",
        title: "Competitor scan failed",
        description: scanError instanceof Error ? scanError.message : "The competitor scan failed.",
      });
    } finally {
      setSyncing(false);
    }
  };

  const reviewSeller = async (candidate: Candidate, action: "approve-seller" | "reject-seller") => {
    if (actionId) return;
    setActionId(candidate.id);
    try {
      const response = await fetch("/api/catalog/competitor-pricing", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, candidateId: candidate.id }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: string; detail?: string };
      if (!response.ok) throw new Error(payload.detail || payload.message || "The seller review could not be saved.");
      toast({
        title: action === "approve-seller" ? "Seller approved" : "Seller rejected",
        description: payload.message,
      });
      await loadSummary();
    } catch (reviewError) {
      toast({
        variant: "destructive",
        title: "Seller review failed",
        description: reviewError instanceof Error ? reviewError.message : "The seller review could not be saved.",
      });
    } finally {
      setActionId("");
    }
  };

  const setProductMode = async (productCode: string, mode: ProductMode) => {
    if (savingProductCode) return;
    setSavingProductCode(productCode);
    try {
      const response = await fetch("/api/catalog/competitor-pricing", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-product-mode", productCode, mode }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: string; detail?: string };
      if (!response.ok) throw new Error(payload.detail || payload.message || "The product mode could not be saved.");
      setSummary((current) => {
        if (!current) return current;
        const existing = current.productControls.filter((control) => control.product_code !== productCode);
        return {
          ...current,
          productControls: [
            ...existing,
            { product_code: productCode, mode, updated_at: new Date().toISOString() },
          ],
        };
      });
      toast({ title: "Product mode updated", description: `${productCode} is now ${formatLabel(mode)}.` });
    } catch (modeError) {
      toast({
        variant: "destructive",
        title: "Product mode not saved",
        description: modeError instanceof Error ? modeError.message : "The product mode could not be saved.",
      });
    } finally {
      setSavingProductCode("");
    }
  };

  const controlsByProduct = useMemo(
    () => new Map((summary?.productControls || []).map((control) => [control.product_code, control.mode])),
    [summary?.productControls],
  );
  const latestRun = summary?.syncRuns?.[0];
  const verifiedSellers = summary?.sellers.filter((seller) => seller.verified && seller.enabled) || [];
  const activeObservations = summary?.observations.filter(
    (observation) => observation.in_stock && new Date(observation.expires_at).getTime() > Date.now(),
  ) || [];

  return (
    <Layout>
      <section className="border-b border-border/60 bg-secondary/25 py-8 md:py-10">
        <div className="container-wide space-y-6">
          <PortalNav />
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Admin Portal</p>
              <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">Competitor pricing</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Google Shopping matches, approved sellers, landed prices and pricing recommendations.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-2 text-xs font-semibold ${statusClass(summary?.mode || "disabled")}`}>
                {formatLabel(summary?.mode || "disabled")}
              </span>
              <Button type="button" variant="outline" onClick={() => void loadSummary()} disabled={loading || syncing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button type="button" onClick={runScan} disabled={loading || syncing}>
                <SearchCheck className={`mr-2 h-4 w-4 ${syncing ? "animate-pulse" : ""}`} />
                {syncing ? "Running scan..." : "Run competitor scan"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide space-y-6">
          {error ? (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Database switch", value: summary?.databaseEnabled ? "On" : "Off" },
              { label: "Latest scan", value: latestRun ? formatLabel(latestRun.status) : "No runs" },
              { label: "Verified matches", value: String(summary?.productMatches.length || 0) },
              { label: "Active observations", value: String(activeObservations.length) },
              { label: "Seller reviews", value: String(summary?.candidates.length || 0) },
            ].map((metric) => (
              <div key={metric.label} className="rounded-lg border border-border/60 bg-card px-4 py-4 shadow-sm">
                <p className="text-xl font-semibold text-foreground">{loading ? "..." : metric.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{metric.label}</p>
              </div>
            ))}
          </div>

          <Tabs defaultValue="runs" className="space-y-4">
            <div className="overflow-x-auto">
              <TabsList className="h-auto min-w-max justify-start">
                <TabsTrigger value="runs">Scan history</TabsTrigger>
                <TabsTrigger value="reviews">Seller reviews ({summary?.candidates.length || 0})</TabsTrigger>
                <TabsTrigger value="observations">Observations ({summary?.observations.length || 0})</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations ({summary?.recommendations.length || 0})</TabsTrigger>
                <TabsTrigger value="matches">Product matches ({summary?.productMatches.length || 0})</TabsTrigger>
                <TabsTrigger value="sellers">Approved sellers ({verifiedSellers.length})</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="runs" className="overflow-hidden rounded-lg border border-border/60 bg-card">
              {summary?.syncRuns.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="border-b border-border/60 bg-secondary/35 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Started</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Products</th>
                        <th className="px-4 py-3 font-medium">Listings</th>
                        <th className="px-4 py-3 font-medium">Observations</th>
                        <th className="px-4 py-3 font-medium">Reviews</th>
                        <th className="px-4 py-3 font-medium">Requests</th>
                        <th className="px-4 py-3 font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {summary.syncRuns.map((run) => (
                        <tr key={run.id}>
                          <td className="whitespace-nowrap px-4 py-3">{formatDate(run.started_at)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(run.status)}`}>
                              {formatLabel(run.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">{run.products_read}</td>
                          <td className="px-4 py-3">{run.listings_read}</td>
                          <td className="px-4 py-3">{run.observations_stored}</td>
                          <td className="px-4 py-3">{run.candidates_stored}</td>
                          <td className="px-4 py-3">{run.requests_made}</td>
                          <td className="max-w-sm px-4 py-3 text-muted-foreground">{run.error_message || "Completed"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState text={loading ? "Loading scan history..." : "No competitor scans have run."} />}
            </TabsContent>

            <TabsContent value="reviews" className="overflow-hidden rounded-lg border border-border/60 bg-card">
              {summary?.candidates.length ? (
                <div className="divide-y divide-border/50">
                  {summary.candidates.map((candidate) => (
                    <div key={candidate.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_auto] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/products/item/${encodeURIComponent(candidate.product_code)}`} className="font-semibold text-foreground hover:text-accent">
                            {candidate.product_code}
                          </Link>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${candidate.in_stock ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                            {candidate.in_stock ? "In stock" : "Not confirmed"}
                          </span>
                        </div>
                        <a href={candidate.competitor_product_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1 break-all text-sm text-accent hover:underline">
                          {candidate.seller_name || candidate.seller_domain}
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </a>
                        <p className="mt-1 text-xs text-muted-foreground">{candidate.seller_domain}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{formatMoney(candidate.observed_price_inc_gst)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Shipping {formatMoney(candidate.observed_shipping_inc_gst)} · {formatLabel(candidate.review_reason)}
                        </p>
                      </div>
                      <div className="flex gap-2 lg:justify-end">
                        <Button type="button" size="sm" variant="outline" onClick={() => void reviewSeller(candidate, "reject-seller")} disabled={Boolean(actionId)}>
                          <X className="mr-1.5 h-4 w-4" /> Reject
                        </Button>
                        <Button type="button" size="sm" onClick={() => void reviewSeller(candidate, "approve-seller")} disabled={Boolean(actionId)}>
                          <Check className="mr-1.5 h-4 w-4" /> {actionId === candidate.id ? "Saving..." : "Approve"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState text={loading ? "Loading seller reviews..." : "No sellers are waiting for review."} />}
            </TabsContent>

            <TabsContent value="observations" className="overflow-hidden rounded-lg border border-border/60 bg-card">
              {summary?.observations.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="border-b border-border/60 bg-secondary/35 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium">Seller</th>
                        <th className="px-4 py-3 font-medium">Item</th>
                        <th className="px-4 py-3 font-medium">Shipping</th>
                        <th className="px-4 py-3 font-medium">Landed</th>
                        <th className="px-4 py-3 font-medium">Availability</th>
                        <th className="px-4 py-3 font-medium">Observed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {summary.observations.map((observation) => {
                        const seller = Array.isArray(observation.seller) ? observation.seller[0] : observation.seller;
                        return (
                          <tr key={observation.id}>
                            <td className="px-4 py-3"><Link className="font-semibold hover:text-accent" to={`/products/item/${encodeURIComponent(observation.product_code)}`}>{observation.product_code}</Link></td>
                            <td className="px-4 py-3"><a className="text-accent hover:underline" href={observation.competitor_product_url} target="_blank" rel="noreferrer">{seller?.name || seller?.domain || "Seller"}</a></td>
                            <td className="px-4 py-3">{formatMoney(observation.item_price_inc_gst)}</td>
                            <td className="px-4 py-3">{formatMoney(observation.shipping_price_inc_gst)}</td>
                            <td className="px-4 py-3 font-semibold">{formatMoney(observation.landed_price_inc_gst)}</td>
                            <td className="px-4 py-3">{observation.in_stock ? "In stock" : "Out of stock"}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(observation.observed_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState text={loading ? "Loading observations..." : "No eligible competitor observations have been stored."} />}
            </TabsContent>

            <TabsContent value="recommendations" className="overflow-hidden rounded-lg border border-border/60 bg-card">
              {summary?.recommendations.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="border-b border-border/60 bg-secondary/35 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium">Standard</th>
                        <th className="px-4 py-3 font-medium">Competitor</th>
                        <th className="px-4 py-3 font-medium">Recommended</th>
                        <th className="px-4 py-3 font-medium">Minimum</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Expires</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {summary.recommendations.map((recommendation) => (
                        <tr key={recommendation.id}>
                          <td className="px-4 py-3"><Link className="font-semibold hover:text-accent" to={`/products/item/${encodeURIComponent(recommendation.product_code)}`}>{recommendation.product_code}</Link></td>
                          <td className="px-4 py-3">{formatMoney(recommendation.standard_price_inc_gst)}</td>
                          <td className="px-4 py-3">{formatMoney(recommendation.competitor_price_inc_gst)}</td>
                          <td className="px-4 py-3 font-semibold text-accent">{formatMoney(recommendation.recommended_price_inc_gst)}</td>
                          <td className="px-4 py-3">{formatMoney(recommendation.minimum_allowed_price_inc_gst)}</td>
                          <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(recommendation.status)}`}>{formatLabel(recommendation.status)}</span></td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(recommendation.expires_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState text={loading ? "Loading recommendations..." : "No price recommendations have been generated."} />}
            </TabsContent>

            <TabsContent value="matches" className="overflow-hidden rounded-lg border border-border/60 bg-card">
              {summary?.productMatches.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="border-b border-border/60 bg-secondary/35 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium">Google identity</th>
                        <th className="px-4 py-3 font-medium">Match</th>
                        <th className="px-4 py-3 font-medium">Last verified</th>
                        <th className="px-4 py-3 font-medium">Product mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {summary.productMatches.map((match) => (
                        <tr key={`${match.provider}-${match.product_code}`}>
                          <td className="px-4 py-3"><Link className="font-semibold hover:text-accent" to={`/products/item/${encodeURIComponent(match.product_code)}`}>{match.product_code}</Link></td>
                          <td className="max-w-md px-4 py-3"><p className="line-clamp-2 font-medium">{match.provider_product_name || match.provider_product_id}</p><p className="mt-1 text-xs text-muted-foreground">{match.provider_product_id}</p></td>
                          <td className="px-4 py-3">{formatLabel(match.match_method)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(match.last_seen_at)}</td>
                          <td className="px-4 py-3">
                            <select
                              value={controlsByProduct.get(match.product_code) || "monitor_only"}
                              onChange={(event) => void setProductMode(match.product_code, event.target.value as ProductMode)}
                              disabled={Boolean(savingProductCode)}
                              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                              aria-label={`Pricing mode for ${match.product_code}`}
                            >
                              <option value="monitor_only">Monitor</option>
                              <option value="automatic">Automatic</option>
                              <option value="excluded">Excluded</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState text={loading ? "Loading product matches..." : "No Google product identities have been verified."} />}
            </TabsContent>

            <TabsContent value="sellers" className="overflow-hidden rounded-lg border border-border/60 bg-card">
              {verifiedSellers.length ? (
                <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                  {verifiedSellers.map((seller) => (
                    <div key={seller.id} className="rounded-lg border border-border/60 bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{seller.name}</p>
                          <a href={`https://${seller.domain}`} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm text-accent hover:underline">{seller.domain}</a>
                        </div>
                        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">Verified {formatDate(seller.verified_at)} · {seller.provider || "Any provider"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center px-5 py-12 text-center">
                  <Store className="h-6 w-6 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">No competitor sellers have been approved.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default CompetitorPricingAdmin;
