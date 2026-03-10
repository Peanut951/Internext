import { useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  {
    quote:
      "Internext helps us present a broader catalogue without making the customer experience feel fragmented. That matters when speed and credibility are both on the line.",
    author: "Sarah Mitchell",
    role: "Director",
    company: "TechSolutions Australia",
  },
  {
    quote:
      "The product access is useful, but the real value is the practical support around quoting, category expansion, and getting orders moving when timing is tight.",
    author: "James Wong",
    role: "CEO",
    company: "NetPro Systems",
  },
  {
    quote:
      "Internext feels commercially aware. The relationship is structured around helping us respond faster and look stronger in front of our own customers.",
    author: "Michelle Thompson",
    role: "Sales Manager",
    company: "CloudFirst IT",
  },
];

const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeTestimonial = testimonials[currentIndex];

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="relative overflow-hidden bg-primary py-20 md:py-24">
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="container-wide relative">
        <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-stretch">
          <div className="rounded-[1.75rem] border border-primary-foreground/15 bg-primary-foreground/10 p-8 text-primary-foreground backdrop-blur-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Partner Feedback
            </p>
            <h2 className="mt-3 text-3xl font-bold text-primary-foreground md:text-4xl">
              Built to feel useful when the pressure is real.
            </h2>
            <p className="mt-4 text-primary-foreground/72 leading-relaxed">
              A distributor relationship should improve customer confidence, not complicate it.
              These are the kinds of outcomes reseller teams care about in practice.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-2xl border border-primary-foreground/14 bg-primary-foreground/8 p-4">
                <p className="text-2xl font-bold">500+</p>
                <p className="mt-1 text-sm text-primary-foreground/70">Australian reseller relationships supported</p>
              </div>
              <div className="rounded-2xl border border-primary-foreground/14 bg-primary-foreground/8 p-4">
                <p className="text-2xl font-bold">Statewide</p>
                <p className="mt-1 text-sm text-primary-foreground/70">Coverage across business and government buyers</p>
              </div>
              <div className="rounded-2xl border border-primary-foreground/14 bg-primary-foreground/8 p-4">
                <p className="text-2xl font-bold">Multi-category</p>
                <p className="mt-1 text-sm text-primary-foreground/70">AV, print, UC, surveillance, networking, and more</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-primary-foreground/15 bg-primary-foreground/8 p-6 shadow-[0_24px_80px_-30px_rgba(0,0,0,0.45)] backdrop-blur-sm md:p-8">
            <div className="rounded-[1.5rem] border border-primary-foreground/15 bg-navy-dark/55 p-6 md:p-8">
              <Quote className="h-10 w-10 text-accent/75" />

              <blockquote className="mt-6 text-2xl font-light leading-relaxed text-primary-foreground md:text-3xl">
                "{activeTestimonial.quote}"
              </blockquote>

              <div className="mt-8 flex flex-col gap-6 border-t border-primary-foreground/12 pt-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-primary-foreground">
                    {activeTestimonial.author}
                  </p>
                  <p className="text-sm text-primary-foreground/68">
                    {activeTestimonial.role}, {activeTestimonial.company}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={prev}
                    className="border border-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  <div className="flex gap-2">
                    {testimonials.map((testimonial, index) => (
                      <button
                        key={testimonial.author}
                        type="button"
                        onClick={() => setCurrentIndex(index)}
                        className={`h-2.5 rounded-full transition-all ${
                          index === currentIndex
                            ? "w-8 bg-accent"
                            : "w-2.5 bg-primary-foreground/28 hover:bg-primary-foreground/45"
                        }`}
                        aria-label={`View testimonial ${index + 1}`}
                      />
                    ))}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={next}
                    className="border border-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
