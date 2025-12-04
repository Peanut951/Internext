import { useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  {
    quote: "Internext has been instrumental in our growth. Their technical support team is exceptional, and the speed of delivery keeps our customers happy.",
    author: "Sarah Mitchell",
    role: "Director",
    company: "TechSolutions Australia",
  },
  {
    quote: "The partnership with Internext gave us access to premium brands we couldn't source before. Their account management is top-notch.",
    author: "James Wong",
    role: "CEO",
    company: "NetPro Systems",
  },
  {
    quote: "From day one, Internext treated us as partners, not just customers. The MDF programs and marketing support have driven real results.",
    author: "Michelle Thompson",
    role: "Sales Manager",
    company: "CloudFirst IT",
  },
];

const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="section-padding bg-primary">
      <div className="container-wide">
        <div className="max-w-4xl mx-auto text-center">
          <Quote className="h-12 w-12 text-accent mx-auto mb-8 opacity-50" />
          
          <div className="relative overflow-hidden">
            <div
              className="transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              <div className="flex">
                {testimonials.map((testimonial, index) => (
                  <div
                    key={index}
                    className="w-full flex-shrink-0 px-4"
                  >
                    <blockquote className="text-2xl md:text-3xl text-primary-foreground font-light leading-relaxed mb-8">
                      "{testimonial.quote}"
                    </blockquote>
                    <div className="space-y-1">
                      <div className="text-accent font-semibold text-lg">
                        {testimonial.author}
                      </div>
                      <div className="text-primary-foreground/60">
                        {testimonial.role}, {testimonial.company}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={prev}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex 
                      ? "bg-accent w-6" 
                      : "bg-primary-foreground/30 hover:bg-primary-foreground/50"
                  }`}
                />
              ))}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
