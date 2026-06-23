import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import RequireAdmin from "./components/auth/RequireAdmin";
import RequireAuth from "./components/auth/RequireAuth";
import RequirePortalHome from "./components/auth/RequirePortalHome";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/layout/Layout";
import { trackPageView } from "@/lib/analytics";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AboutIndex = lazy(() => import("./pages/about/AboutIndex"));
const WhyPartner = lazy(() => import("./pages/about/WhyPartner"));
const Team = lazy(() => import("./pages/about/Team"));
const Customers = lazy(() => import("./pages/about/Customers"));
const ProductsIndex = lazy(() => import("./pages/products/ProductsIndex"));
const ProductCategory = lazy(() => import("./pages/products/ProductCategory"));
const ProductDetail = lazy(() => import("./pages/products/ProductDetail"));
const ProductSearch = lazy(() => import("./pages/products/ProductSearch"));
const Cart = lazy(() => import("./pages/checkout/Cart"));
const Checkout = lazy(() => import("./pages/checkout/Checkout"));
const OrdersAdmin = lazy(() => import("./pages/admin/OrdersAdmin"));
const PortalDashboard = lazy(() => import("./pages/portal/Dashboard"));
const PortalOrders = lazy(() => import("./pages/portal/Orders"));
const ServicesIndex = lazy(() => import("./pages/services/ServicesIndex"));
const Installation = lazy(() => import("./pages/services/Installation"));
const ServiceRequest = lazy(() => import("./pages/services/ServiceRequest"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const FAQ = lazy(() => import("./pages/support/FAQ"));
const Shipping = lazy(() => import("./pages/support/Shipping"));
const Warranty = lazy(() => import("./pages/support/Warranty"));
const ReturnsRefunds = lazy(() => import("./pages/support/ReturnsRefunds"));
const PaymentSecurity = lazy(() => import("./pages/support/PaymentSecurity"));
const ConsumerGuarantees = lazy(() => import("./pages/support/ConsumerGuarantees"));
const Privacy = lazy(() => import("./pages/support/Privacy"));
const Terms = lazy(() => import("./pages/support/Terms"));
const Contact = lazy(() => import("./pages/Contact"));

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    trackPageView(pathname);
  }, [pathname]);

  return null;
};

const RouteFallback = () => (
  <Layout>
    <section className="section-padding bg-background">
      <div className="container-custom">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-56 rounded-lg bg-secondary" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-36 rounded-2xl border border-border/50 bg-card shadow-card" />
            <div className="h-36 rounded-2xl border border-border/50 bg-card shadow-card" />
            <div className="h-36 rounded-2xl border border-border/50 bg-card shadow-card" />
          </div>
          <div className="h-64 rounded-2xl border border-border/50 bg-card shadow-card" />
        </div>
      </div>
    </section>
  </Layout>
);

const AppRoutes = () => {
  const { pathname } = useLocation();

  return (
    <ErrorBoundary resetKey={pathname}>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* About */}
          <Route path="/about" element={<AboutIndex />} />
          <Route path="/about/why-partner" element={<WhyPartner />} />
          <Route path="/about/team" element={<Team />} />
          <Route path="/about/customers" element={<Customers />} />
          {/* Products */}
          <Route path="/products" element={<ProductsIndex />} />
          <Route path="/products/search" element={<ProductSearch />} />
          <Route path="/products/item/:code" element={<ProductDetail />} />
          <Route path="/products/:category" element={<ProductCategory />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route
            path="/portal"
            element={
              <RequirePortalHome>
                <PortalDashboard />
              </RequirePortalHome>
            }
          />
          <Route
            path="/portal/orders"
            element={
              <RequireAuth>
                <PortalOrders />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <RequireAdmin>
                <OrdersAdmin />
              </RequireAdmin>
            }
          />
          {/* Services */}
          <Route path="/services" element={<ServicesIndex />} />
          <Route path="/services/installation" element={<Installation />} />
          <Route path="/services/request" element={<ServiceRequest />} />
          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login/register" element={<Register />} />
          {/* Support */}
          <Route path="/support/faq" element={<FAQ />} />
          <Route path="/support/shipping" element={<Shipping />} />
          <Route path="/support/warranty" element={<Warranty />} />
          <Route path="/support/returns" element={<ReturnsRefunds />} />
          <Route path="/support/payment-security" element={<PaymentSecurity />} />
          <Route path="/support/consumer-guarantees" element={<ConsumerGuarantees />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          {/* Contact */}
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
