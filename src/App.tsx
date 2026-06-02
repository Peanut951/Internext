import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
// About
import AboutIndex from "./pages/about/AboutIndex";
import WhyPartner from "./pages/about/WhyPartner";
import Team from "./pages/about/Team";
import Customers from "./pages/about/Customers";
// Products
import ProductsIndex from "./pages/products/ProductsIndex";
import ProductCategory from "./pages/products/ProductCategory";
import ProductDetail from "./pages/products/ProductDetail";
import ProductSearch from "./pages/products/ProductSearch";
import Cart from "./pages/checkout/Cart";
import Checkout from "./pages/checkout/Checkout";
import OrdersAdmin from "./pages/admin/OrdersAdmin";
import RequireAdmin from "./components/auth/RequireAdmin";
import RequireAuth from "./components/auth/RequireAuth";
import RequirePortalHome from "./components/auth/RequirePortalHome";
import PortalDashboard from "./pages/portal/Dashboard";
import PortalOrders from "./pages/portal/Orders";
// Services
import ServicesIndex from "./pages/services/ServicesIndex";
import Installation from "./pages/services/Installation";
import ServiceRequest from "./pages/services/ServiceRequest";
// Auth
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Signup from "./pages/auth/Signup";
// Support
import FAQ from "./pages/support/FAQ";
import Shipping from "./pages/support/Shipping";
import Warranty from "./pages/support/Warranty";
import Privacy from "./pages/support/Privacy";
import Terms from "./pages/support/Terms";
// Contact
import Contact from "./pages/Contact";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
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
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          {/* Contact */}
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
