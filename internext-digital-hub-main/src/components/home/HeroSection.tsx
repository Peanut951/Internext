import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative bg-gradient-hero overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-light rounded-full blur-3xl" />
      </div>

      <div className="container-wide relative py-24 md:py-32 lg:py-40">
        <div className="max-w-3xl space-y-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight animate-fade-in-up">
            Empowering resellers with{" "}
            <span className="text-accent">smarter distribution.</span>
          </h1>
          
          <p 
            className="text-xl text-primary-foreground/80 max-w-2xl leading-relaxed animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            Supporting Australian technology resellers with premium products, 
            dedicated service, and partnership-driven growth. Your success is our mission.
          </p>

          <div 
            className="flex flex-col sm:flex-row gap-4 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <Link to="/about">
              <Button variant="hero" size="lg" className="gap-2">
                Explore How We Help
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="hero-outline" size="lg" className="gap-2">
                <Users className="h-5 w-5" />
                Become a Reseller
              </Button>
            </Link>
          </div>

          <div 
            className="flex items-center gap-8 pt-8 animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">500+</div>
              <div className="text-sm text-primary-foreground/60">Active Partners</div>
            </div>
            <div className="w-px h-12 bg-primary-foreground/20" />
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">25+</div>
              <div className="text-sm text-primary-foreground/60">Premium Brands</div>
            </div>
            <div className="w-px h-12 bg-primary-foreground/20" />
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">15</div>
              <div className="text-sm text-primary-foreground/60">Years Experience</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
