import Layout from "@/components/layout/Layout";
import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const faqCategories = [
  {
    title: "Ordering",
    questions: [
      { q: "How do I place an order?", a: "You can add products to cart online and check out as a signed-in customer or as a guest where available." },
      { q: "What payment methods do you accept?", a: "We accept card payments at checkout. Approved business and reseller accounts may have separate payment terms." },
      { q: "Can I modify an order after it's been placed?", a: "Orders can sometimes be modified before dispatch. Please contact us as soon as possible to request changes." },
      { q: "What is your minimum order value?", a: "There is no minimum order value for standard online checkout unless a specific product or freight arrangement states otherwise." },
    ],
  },
  {
    title: "Delivery",
    questions: [
      { q: "What are your delivery timeframes?", a: "Metro areas are typically 1-3 business days after dispatch. Regional areas are generally 2-5 business days depending on location." },
      { q: "Do you ship to regional areas?", a: "Yes, we deliver Australia-wide including regional and remote areas. Additional freight charges may apply for remote locations." },
      { q: "Can I track my order?", a: "Yes, tracking information is provided by email once your order is dispatched and the carrier has supplied tracking details." },
      { q: "Do you offer express shipping?", a: "Express options may be available for selected products and delivery areas." },
    ],
  },
  {
    title: "Accounts",
    questions: [
      { q: "How do I apply for a reseller account?", a: "You can apply online through our 'Become a Reseller' page. Applications are typically processed within 2 business days." },
      { q: "What are your payment terms?", a: "Standard terms are 30 days from invoice for approved accounts. Terms may vary based on account history and credit assessment." },
      { q: "How do I update my account details?", a: "Contact us if you need help updating account details or delivery information." },
      { q: "Can I have multiple users on my account?", a: "Approved business and reseller accounts can request multiple users where needed." },
    ],
  },
  {
    title: "Warranty",
    questions: [
      { q: "What warranty coverage do products have?", a: "Warranty periods vary by manufacturer and product. Details are included with each product listing and on the manufacturer's documentation." },
      { q: "How do I make a warranty claim?", a: "Warranty claims can be started by contacting our support team with the product details, proof of purchase, and issue description." },
      { q: "What is your DOA (Dead on Arrival) policy?", a: "Products found to be faulty within 14 days of delivery can be returned as DOA for immediate replacement, subject to our returns policy." },
      { q: "Are there any exclusions to warranty coverage?", a: "Warranties typically don't cover physical damage, misuse, or issues caused by incorrect installation. See specific product warranty terms for details." },
    ],
  },
  {
    title: "Returns",
    questions: [
      { q: "What is your returns policy?", a: "Non-faulty returns may be accepted within 30 days of purchase, subject to a restocking fee. Products must be unopened and in original packaging." },
      { q: "How do I arrange a return?", a: "Contact our returns team with the order and product details. We will review the request and provide the next steps." },
      { q: "Who pays for return shipping?", a: "For faulty products covered under warranty, we cover return shipping. For non-faulty returns, the customer is responsible for shipping costs." },
      { q: "How long do refunds take to process?", a: "Refunds are typically processed within 5-7 business days of receiving the returned goods and completing inspection." },
    ],
  },
  {
    title: "Technical",
    questions: [
      { q: "Do you offer technical support?", a: "Yes, we have a team of technical specialists available to assist with product selection, configuration, and troubleshooting." },
      { q: "Can you help with solution design?", a: "Our pre-sales team can assist with solution design, product selection, and project scoping for complex deployments." },
      { q: "Do you provide installation services?", a: "Yes, professional installation services are available for AV, security, networking, and print equipment. See our Technical Services pages for details." },
      { q: "Where can I find product documentation?", a: "Product datasheets, manuals, and specifications are shown on individual product pages when available." },
    ],
  },
];

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-14 sm:py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="mb-4 text-3xl font-bold text-primary-foreground sm:text-4xl md:text-5xl">
              Frequently Asked Questions
            </h1>
            <p className="mb-6 text-base leading-7 text-primary-foreground/80 sm:text-lg">
              Find answers to common questions about ordering, delivery, and support.
            </p>
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-3 bg-card border-0 text-foreground"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto">
            {faqCategories.map((category) => (
              <div key={category.title} className="mb-10">
                <h2 className="text-2xl font-bold text-foreground mb-6 pb-3 border-b border-border">
                  {category.title}
                </h2>
                <div className="space-y-3">
                  {category.questions
                    .filter(
                      (item) =>
                        !searchQuery ||
                        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.a.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item, idx) => {
                      const itemId = `${category.title}-${idx}`;
                      const isOpen = openItems.includes(itemId);
                      return (
                        <div
                          key={idx}
                          className="bg-card rounded-xl border border-border/50 overflow-hidden"
                        >
                          <button
                            onClick={() => toggleItem(itemId)}
                            className="w-full flex items-center justify-between p-5 text-left"
                          >
                            <span className="font-medium text-foreground pr-4">{item.q}</span>
                            <ChevronDown
                              className={`h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-5">
                              <p className="text-muted-foreground">{item.a}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-12 bg-secondary">
        <div className="container-wide text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Still Have Questions?</h2>
          <p className="text-muted-foreground mb-6">
            Our team is here to help. Contact us for personalised assistance.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-navy-light transition-colors"
          >
            Contact Support
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default FAQ;
