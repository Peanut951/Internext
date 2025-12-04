import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import FeatureCards from "@/components/home/FeatureCards";
import BrandsSection from "@/components/home/BrandsSection";
import WhyPartnerSection from "@/components/home/WhyPartnerSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <FeatureCards />
      <BrandsSection />
      <WhyPartnerSection />
      <TestimonialsSection />
    </Layout>
  );
};

export default Index;
