import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
// About
import AboutIndex from "./pages/about/AboutIndex";
import WhyPartner from "./pages/about/WhyPartner";
import Team from "./pages/about/Team";
import Careers from "./pages/about/Careers";
import Customers from "./pages/about/Customers";
// Products
import ProductsIndex from "./pages/products/ProductsIndex";
import ProductCategory from "./pages/products/ProductCategory";
// Brands
import Brands from "./pages/Brands";
import BrandsDetail from "./pages/BrandsDetail";
// Tools
import ToolsIndex from "./pages/tools/ToolsIndex";
import Blog from "./pages/tools/Blog";
import ConsumablesFinder from "./pages/tools/ConsumablesFinder";
import ProductGuide from "./pages/tools/ProductGuide";
// Services
import ServicesIndex from "./pages/services/ServicesIndex";
import Installation from "./pages/services/Installation";
import ServiceRequest from "./pages/services/ServiceRequest";
// Auth
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
// Support
import FAQ from "./pages/support/FAQ";
import Shipping from "./pages/support/Shipping";
import Warranty from "./pages/support/Warranty";
import Privacy from "./pages/support/Privacy";
import Terms from "./pages/support/Terms";
// Contact
import Contact from "./pages/Contact";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* About */}
          <Route path="/about" element={<AboutIndex />} />
          <Route path="/about/why-partner" element={<WhyPartner />} />
          <Route path="/about/team" element={<Team />} />
          <Route path="/about/careers" element={<Careers />} />
          <Route path="/about/customers" element={<Customers />} />
          {/* Products */}
          <Route path="/products" element={<ProductsIndex />} />
          <Route path="/products/:category" element={<ProductCategory />} />
          {/* Brands */}
          <Route path="/brands" element={<Brands />} />
          <Route path="/brands/:brand" element={<BrandsDetail />} />
          {/* Tools */}
          <Route path="/tools" element={<ToolsIndex />} />
          <Route path="/tools/blog" element={<Blog />} />
          <Route path="/tools/consumables-finder" element={<ConsumablesFinder />} />
          <Route path="/tools/product-guide" element={<ProductGuide />} />
          {/* Services */}
          <Route path="/services" element={<ServicesIndex />} />
          <Route path="/services/installation" element={<Installation />} />
          <Route path="/services/request" element={<ServiceRequest />} />
          {/* Auth */}
          <Route path="/login" element={<Login />} />
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
